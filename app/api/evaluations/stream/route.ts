import { requireUser } from "@/lib/auth-server";
import prisma from "@/lib/prisma";
import { overallEvaluationSchema } from "@/lib/schemas";
import { getOptimalModel } from "@/lib/utils";
import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { revalidatePath } from "next/cache";

/** Remove markdown code blocks from AI response if present */
function cleanJsonResponse(text: string): string {
  let jsonText = text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }
  return jsonText.trim();
}

/** Extract text from PDF using unpdf (serverless-compatible) */
async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const { text } = await extractText(pdf, { mergePages: true });

    return text || "";
  } catch (error) {
    console.error("Failed to extract text from PDF:", error);
    throw new Error(
      `Impossibile leggere il curriculum: ${
        error instanceof Error ? error.message : "Errore sconosciuto"
      }`
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { candidateId, positionId } = await request.json();

    if (!candidateId || !positionId) {
      return Response.json(
        { error: "candidateId e positionId sono obbligatori" },
        { status: 400 }
      );
    }

    // Fetch candidate with resume URL
    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        resumeUrl: true,
      },
    });

    if (!candidate) {
      return Response.json({ error: "Candidato non trovato" }, { status: 404 });
    }

    if (!candidate.resumeUrl) {
      return Response.json(
        {
          error:
            "Il candidato non ha un curriculum caricato. Carica un curriculum prima di generare la valutazione.",
        },
        { status: 400 }
      );
    }

    // Fetch position details
    const position = await prisma.position.findUnique({
      where: { id: positionId },
      select: {
        id: true,
        title: true,
        description: true,
        experienceLevel: true,
        skills: true,
        softSkills: true,
      },
    });

    if (!position) {
      return Response.json({ error: "Posizione non trovata" }, { status: 404 });
    }

    // Check if evaluation already exists for this candidate-position combination
    const existingEvaluation = await prisma.evaluation.findFirst({
      where: {
        candidateId,
        positionId,
        interviewId: null, // Only resume evaluations
      },
    });

    if (existingEvaluation) {
      return Response.json(
        {
          error:
            "Esiste già una valutazione per questo candidato e questa posizione",
        },
        { status: 409 }
      );
    }

    // Extract text from resume PDF
    const resumeText = await extractTextFromPDF(candidate.resumeUrl);

    if (!resumeText || resumeText.trim().length < 50) {
      return Response.json(
        {
          error:
            "Impossibile estrarre testo sufficiente dal curriculum. Assicurati che il PDF contenga testo selezionabile.",
        },
        { status: 400 }
      );
    }

    const candidateName = `${candidate.firstName} ${candidate.lastName}`;

    // Limit resume text to 80K chars (models have 128K context, leaving room for prompt/output)
    const maxResumeLength = 80000;
    const truncatedResume = resumeText.substring(0, maxResumeLength);
    const resumeSuffix =
      resumeText.length > maxResumeLength ? "... [troncato]" : "";

    const prompt = `Analizza il seguente curriculum vitae e valuta l'idoneità del candidato per la posizione specificata.

          CURRICULUM DEL CANDIDATO (${candidateName}):
          ${truncatedResume}${resumeSuffix}

          POSIZIONE DA VALUTARE:
          - Titolo: ${position.title}
          - Livello di esperienza richiesto: ${position.experienceLevel}
          - Competenze tecniche richieste: ${position.skills.join(", ")}
          - Soft skills richieste: ${position.softSkills.join(", ")}
          ${
            position.description ? `- Descrizione: ${position.description}` : ""
          }

          Fornisci una valutazione dettagliata considerando:
          1. Corrispondenza delle competenze tecniche
          2. Esperienza lavorativa rilevante
          3. Livello di esperienza rispetto a quanto richiesto
          4. Soft skills e caratteristiche personali evidenziate
          5. Formazione e certificazioni pertinenti
          6. Potenziale di crescita e adattabilità

          Rispondi con un oggetto JSON contenente:
          - evaluation: una valutazione dettagliata in italiano
          - strengths: array di punti di forza del candidato
          - weaknesses: array di aree di miglioramento o lacune
          - recommendation: una raccomandazione su come procedere con il candidato
          - fitScore: un punteggio da 0 a 100 che indica l'idoneità complessiva per la posizione`;

    const model = getOptimalModel("overall_evaluation");

    const jsonFormatInstructions = `

          IMPORTANTE: Rispondi SOLO con un oggetto JSON valido, senza markdown o altri formati. L'oggetto deve avere questa struttura esatta:
          {
            "evaluation": "testo della valutazione",
            "strengths": ["punto 1", "punto 2", ...],
            "weaknesses": ["punto 1", "punto 2", ...],
            "recommendation": "testo della raccomandazione",
            "fitScore": numero da 0 a 100
          }`;

    const result = streamText({
      model: groq(model),
      prompt: prompt + jsonFormatInstructions,
      system:
        "Sei un esperto recruiter tecnico che valuta candidati in modo oggettivo e costruttivo. Basa la tua valutazione esclusivamente sulle informazioni fornite nel curriculum. Rispondi sempre in italiano. Rispondi SOLO con JSON valido.",
    });

    // Stream the text response directly
    const encoder = new TextEncoder();
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullText += chunk;
            // Send the accumulated text so far
            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();

          // After streaming completes, parse and save to database
          try {
            const jsonText = cleanJsonResponse(fullText);
            const parsed = overallEvaluationSchema.parse(JSON.parse(jsonText));

            await prisma.evaluation.create({
              data: {
                title: position.title,
                candidateId: candidate.id,
                positionId: position.id,
                evaluation: parsed.evaluation,
                strengths: parsed.strengths,
                weaknesses: parsed.weaknesses,
                recommendation: parsed.recommendation,
                fitScore: Math.round(parsed.fitScore / 10),
                createdBy: user.id,
              },
            });

            // Revalidate the candidate page to show the new evaluation
            revalidatePath(`/dashboard/candidates/${candidateId}`);
          } catch (parseError) {
            console.error("Error parsing/saving evaluation:", parseError);
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error streaming evaluation:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Errore durante la generazione della valutazione",
      },
      { status: 500 }
    );
  }
}
