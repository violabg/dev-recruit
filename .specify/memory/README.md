# DevRecruit AI Constitution System

**A comprehensive governance system for DevRecruit AI**

---

## 📋 What's In This Folder

This folder contains the constitution and supporting documents that govern DevRecruit AI's architecture and engineering practices.

### Core Documents

1. **[constitution.md](./constitution.md)** ⭐ **START HERE**

   - The official governance document
   - 5 core principles
   - Refactoring roadmap
   - Enforcement mechanisms

2. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** 📌 **KEEP HANDY**

   - Quick lookup for principles
   - Code templates
   - Common mistakes
   - Debugging checklist

3. **[TEAM_ADOPTION_GUIDE.md](./TEAM_ADOPTION_GUIDE.md)** 👥 **FOR THE TEAM**
   - Explains each principle simply
   - Day-in-the-life examples
   - Common mistakes and fixes
   - FAQ

### Analysis & Implementation

4. **[ALIGNMENT_REPORT.md](./ALIGNMENT_REPORT.md)** 📊 **AUDIT RESULTS**

   - Current codebase analysis
   - Areas of compliance
   - Issues to address
   - Prioritized recommendations

5. **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** 🛠️ **HOW-TO**
   - Step-by-step implementation
   - 4 phases with timelines
   - Code examples
   - Testing checklists

---

## 🎯 The 5 Principles (TL;DR)

| #   | Principle                                       | Impact                | Priority    |
| --- | ----------------------------------------------- | --------------------- | ----------- |
| 1   | **Server Actions Over API Routes**              | Security + Simplicity | MANDATORY   |
| 2   | **Entity-Separated Actions & Data**             | Maintainability       | MANDATORY   |
| 3   | **Cache Components with Tagged Revalidation**   | Performance           | MANDATORY   |
| 4   | **Suspense Boundaries with Skeleton Fallbacks** | UX + Streaming        | MANDATORY   |
| 5   | **useActionState & useTransition**              | DX + Code Quality     | RECOMMENDED |

---

## 📊 Codebase Status

✅ **Compliance:** 75% (Good foundation)

### Strengths

- ✅ Server actions properly organized
- ✅ Entity separation in place
- ✅ Suspense boundaries implemented
- ✅ Form hooks being used

### Areas for Improvement

- ⚠️ 6 `loading.tsx` files to convert
- ⚠️ 4 API routes to migrate
- ⚠️ Cache tag coverage gaps
- ⚠️ Some generic fallbacks

---

## 🚀 Getting Started

### For New Team Members

1. Read: [TEAM_ADOPTION_GUIDE.md](./TEAM_ADOPTION_GUIDE.md)
2. Bookmark: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. Explore: [constitution.md](./constitution.md)

### For Project Leads

1. Review: [ALIGNMENT_REPORT.md](./ALIGNMENT_REPORT.md)
2. Plan: Use [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
3. Track: Follow the 4-phase roadmap

### For Code Reviewers

1. Use checklist in [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#checklist-for-code-review)
2. Reference: [TEAM_ADOPTION_GUIDE.md#common-mistakes](./TEAM_ADOPTION_GUIDE.md#common-mistakes-and-how-to-fix-them)

---

## 📈 Implementation Roadmap

### Phase 1: API Routes Migration (URGENT)

- **Effort:** 1-2 days
- **Impact:** Security + Simplicity
- **Files:** 4 API routes → server actions

### Phase 2: Cache Tag Completion (HIGH)

- **Effort:** Few hours
- **Impact:** Performance + Consistency
- **Files:** lib/data + lib/actions

### Phase 3: Suspense & Fallbacks (MEDIUM)

- **Effort:** 1-2 days
- **Impact:** UX + Streaming
- **Files:** 6 loading.tsx → fallbacks.tsx

### Phase 4: Form Hook Optimization (OPTIONAL)

- **Effort:** Few hours
- **Impact:** Code Quality
- **Files:** 3 form components

**Total effort:** ~5 days for full compliance

---

## 📖 File Guide

| File                      | Purpose                 | Read When            |
| ------------------------- | ----------------------- | -------------------- |
| `constitution.md`         | Governance & principles | Need official rules  |
| `QUICK_REFERENCE.md`      | Templates & checklists  | Coding/reviewing     |
| `TEAM_ADOPTION_GUIDE.md`  | Explanation & examples  | Learning principles  |
| `ALIGNMENT_REPORT.md`     | Audit results           | Planning work        |
| `IMPLEMENTATION_GUIDE.md` | Step-by-step guides     | Implementing changes |
| `README.md`               | This file               | Getting oriented     |

---

## 🔗 Key External References

- **Next.js Documentation:** https://nextjs.org/docs
- **Cache Components:** `docs/CACHE_IMPLEMENTATION.md`
- **Design System:** `docs/VISION_PRO_STYLE_GUIDE.md`
- **AI Integration:** `docs/QUIZ_AI_GENERATION_SYSTEM.md`

---

## ✅ Constitution Version

- **Current Version:** 1.0.0
- **Status:** 🟢 Active & Enforced
- **Ratified:** 2025-11-20
- **Last Amended:** 2025-11-20

---

## 🤝 Contributing to the Constitution

### Making Changes

1. Identify the need (issue, discussion, or decision)
2. Create an ADR (Architecture Decision Record)
3. Propose changes in a PR with rationale
4. Team reviews and approves
5. Version bump applied
6. Documentation updated

### Semantic Versioning

- **MAJOR:** Breaking changes (principle removal/redefinition)
- **MINOR:** New principles or material expansion
- **PATCH:** Clarifications, wording, corrections

---

## 📞 Getting Help

### Questions About Principles

→ Read [TEAM_ADOPTION_GUIDE.md](./TEAM_ADOPTION_GUIDE.md#five-core-principles-explained)

### How to Implement

→ Follow [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)

### Code Examples Needed

→ Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

### Current Issues to Fix

→ See [ALIGNMENT_REPORT.md](./ALIGNMENT_REPORT.md)

### Questions During Code Review

→ Use checklist in [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#checklist-for-code-review)

---

## 🎓 Learning Path

```
1. Start Here
   └─> TEAM_ADOPTION_GUIDE.md

2. Understand the Why
   └─> constitution.md (Principles section)

3. Learn How
   └─> QUICK_REFERENCE.md (Templates)

4. See the Current State
   └─> ALIGNMENT_REPORT.md

5. Start Implementing
   └─> IMPLEMENTATION_GUIDE.md
```

---

## 📋 Quick Compliance Checklist

Before committing, ask:

- [ ] Is this a mutation? → `lib/actions/<entity>.ts` + `updateTag()`
- [ ] Is this a query? → `lib/data/<entity>.ts` + `cacheTag()`
- [ ] Is async content? → `<Suspense>` + `fallbacks.tsx`
- [ ] Is a form? → `useActionState` or `useTransition`
- [ ] No API routes (except auth)? → Delete or migrate
- [ ] No `loading.tsx`? → Use Suspense instead

---

## 🔍 Enforcement

### Pull Request Review

- All PRs checked against constitution
- Non-compliant code will be flagged
- Link to relevant constitution sections provided
- Merge requires compliance

### Code Quality

- TypeScript strict mode
- ESLint rules
- Architecture linting (via code review)

### Documentation

- ADRs for deviations
- Update constitution when principles evolve

---

## 📊 Metrics to Track

- **Phase Completion:** % of each phase done
- **Cache Coverage:** % of queries with `cacheTag`
- **Suspense Coverage:** % of async content wrapped
- **API Routes:** Count remaining (target: 0 non-auth)
- **Form Hooks:** % using `useActionState`/`useTransition`

---

## 🎯 Success Criteria

When the constitution is fully adopted:

✅ All mutations use server actions  
✅ All queries tagged with cacheTag  
✅ All mutations call updateTag  
✅ No loading.tsx files (except layout)  
✅ All async content wrapped in Suspense  
✅ All forms use proper hooks  
✅ Team understands and enforces principles  
✅ New features follow conventions automatically

---

## 📅 Timeline

- **2025-11-20:** Constitution ratified
- **Phase 1-4:** Next 2-3 weeks
- **Full Compliance:** Target 2025-12-10
- **Review & Refinement:** Ongoing

---

## 🙋 FAQ

**Q: Is this flexible?**  
A: The core principles are mandatory. Exceptions require team discussion and ADRs.

**Q: What if I disagree?**  
A: Let's discuss it! The constitution can evolve, but changes go through proper review.

**Q: How do I stay updated?**  
A: Watch this folder. Major changes will be announced to the team.

**Q: Who enforces this?**  
A: The team, through code review. It's collaborative.

---

## 📝 Document History

| Version | Date       | Changes                                     |
| ------- | ---------- | ------------------------------------------- |
| 1.0.0   | 2025-11-20 | Initial constitution with 5 core principles |

---

## 🎉 Welcome!

This constitution represents our commitment to:

- **Building fast, secure, maintainable software**
- **Providing great user experiences**
- **Making development enjoyable**

By following these principles, you're part of something bigger than yourself.

---

**Last Updated:** 2025-11-20  
**Maintained by:** DevRecruit AI Team  
**Status:** 🟢 Active

---

**Ready to start?** → Read [TEAM_ADOPTION_GUIDE.md](./TEAM_ADOPTION_GUIDE.md)

**Ready to implement?** → Follow [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)

**Need templates?** → Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
