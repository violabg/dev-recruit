import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Quiz } from "@/lib/data/quizzes";
import { formatDate } from "@/lib/utils";
import { Clock, Eye, Link2 } from "lucide-react";
import Link from "next/link";

type Props = {
  quiz: Quiz;
};

export function QuizCard({
  quiz: { id, title, positions, time_limit, questions, created_at },
}: Props) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-1">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {positions && <Badge variant="outline">{positions?.title}</Badge>}
            {positions && (
              <Badge variant="outline">{positions.experience_level}</Badge>
            )}
            {time_limit && (
              <Badge variant="secondary">
                <Clock className="mr-1 w-3 h-3" />
                {time_limit} minuti
              </Badge>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {questions.length} domande
            </span>
            <span className="text-muted-foreground">
              {formatDate(created_at)}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-auto pt-2">
        <div className="flex justify-between gap-2 w-full">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/quizzes/${id}`}>
              <Eye className="mr-1 w-4 h-4" />
              Visualizza
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/dashboard/quizzes/${id}/invite`}>
              <Link2 className="mr-1 w-4 h-4" />
              Associa candidato
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
