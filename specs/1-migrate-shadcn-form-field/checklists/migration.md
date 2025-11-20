# Migration Checklist: Form to Field

**Purpose**: Track migration progress for each form component from Form to Field wrapper.

**Status**: In Progress

## Form Components to Migrate

| Component                     | File Path                                                                    | Status  | Notes                    |
| ----------------------------- | ---------------------------------------------------------------------------- | ------- | ------------------------ |
| Login Form                    | components/auth/login-form.tsx                                               | ✅ Done | Migrated to Field layout |
| Signup Form                   | components/auth/sign-up-form.tsx                                             | ✅ Done | Migrated to Field layout |
| Forgot Password Form          | components/auth/forgot-password-form.tsx                                     | ✅ Done | Migrated to Field layout |
| Update Password Form          | components/auth/update-password-form.tsx                                     | ✅ Done | Migrated to Field layout |
| New Position Form             | components/positions/new-position-form.tsx                                   | ✅ Done | Migrated to Field layout |
| Edit Position Form            | components/positions/edit-position-form.tsx                                  | ✅ Done | Migrated to Field layout |
| Quiz Selection Form           | components/quiz/quiz-selection-form.tsx                                      | ✅ Done | Migrated to Field layout |
| Quiz Form                     | app/dashboard/positions/[id]/quiz/new/QuizForm.tsx                           | ✅ Done | Migrated to Field layout |
| Candidate Selection Form      | components/interview/candidate-selection-form.tsx                            | ✅ Done | Migrated to Field layout |
| Edit Quiz Form                | app/dashboard/quizzes/[id]/edit/components/edit-quiz-form.tsx                | Pending |                          |
| AI Quiz Generation Dialog     | app/dashboard/quizzes/[id]/edit/components/ai-quiz-generation-dialog.tsx     | Pending |                          |
| AI Question Generation Dialog | app/dashboard/quizzes/[id]/edit/components/ai-question-generation-dialog.tsx | Pending |                          |

## Migration Steps per Component

1. **Backup**: Create backup of original component
2. **Import Field**: Add Field import from @/components/ui/form
3. **Replace Form wrapper**: Replace `<Form>` with individual `<Field>` components
4. **Update field structure**: Adjust FormField usage to Field usage
5. **Test compilation**: Ensure component compiles
6. **Test functionality**: Verify validation and submission work
7. **Remove Form import**: Clean up unused Form import
8. **Mark complete**: Update this checklist

## Validation Criteria

- [ ] Component compiles without errors
- [ ] Form validation works correctly
- [ ] Form submission succeeds
- [ ] No visual regressions
- [ ] Accessibility maintained
- [ ] All tests pass (if applicable)

## Completion Summary

- **Total Components**: 12
- **Completed**: 9
- **Remaining**: 3
- **Success Rate**: 75%
