# Reference Data Migration - Audit Report

## Summary

Comprehensive audit of remaining static reference data imports and usages across the codebase.

**Status:** Audit complete. 2 components still importing from static data file need refactoring.

---

## Static Data File

**Location:** `components/positions/data.ts`

Contains 7 reference data arrays:

- `programmingLanguages` - Used in 2 client components
- `frameworks` - Removed from active usage ✅
- `databases` - Removed from active usage ✅
- `tools` - Removed from active usage ✅
- `softSkills` - Seeded to DB, integrated in position-form-with-data ✅
- `contractTypes` - Seeded to DB, integrated in position-form-with-data ✅
- `experienceLevels` - Seeded to DB, integrated in position-form-with-data ✅

---

## Findings

### ✅ Already Refactored (DB-Backed)

#### 1. Position Form Workflow

- **File:** `components/positions/position-form.tsx`
- **Change:** Refactored to accept reference data as props (allSkills, allSoftSkills, experienceLevels, contractTypes)
- **Integration:** Uses `position-form-with-data.tsx` server wrapper for fetching

#### 2. Position Pages

- **Files:**
  - `app/dashboard/positions/new/page.tsx`
  - `app/dashboard/positions/[id]/edit/page.tsx`
- **Change:** Updated to use `PositionFormLoading` wrapper and `PositionFormWithData`
- **Data Flow:** Server component fetches 4 categories in parallel, passes to form as props

#### 3. Code Snippet Form

- **File:** `components/quiz/question-types/code-snippet-form.tsx`
- **Status:** Partially refactored (accepts `languageOptions` prop)
- **Note:** Parent component not yet wired for DB integration

#### 4. Position Level Options

- **File:** `components/positions/position-level-options.tsx`
- **Status:** Already using DB query `getPositionLevelsForSelect()`
- **Pattern:** Server component, no static imports

#### 5. Position Options

- **File:** `components/positions/position-options.tsx`
- **Status:** Already using DB query `getPositionsForSelect()`
- **Pattern:** Server component, no static imports

---

### ⚠️ Still Using Static Data (Need Refactoring)

#### 1. SearchAndFilterInterviews

**File:** `components/interviews/search-and-filter-interviews.tsx`

**Issue:** Line 30 imports `programmingLanguages` from static data

```tsx
import { programmingLanguages } from "../positions/data";
```

**Usage:** Line 183 - renders language filter dropdown

```tsx
{
  programmingLanguages.map((lang) => (
    <SelectItem key={lang} value={lang}>
      {lang}
    </SelectItem>
  ));
}
```

**Refactoring Plan:**

- Change to client component that accepts `languageOptions` prop
- Create server wrapper `search-and-filter-interviews-with-data.tsx`
- Fetch from `getReferenceDataByCategory("skill")` or similar
- Update `app/dashboard/interviews/page.tsx` to use wrapper

**Context:** Used in interviews page at `app/dashboard/interviews/page.tsx`

---

#### 2. AIQuestionGenerationDialog

**File:** `components/quiz/ai-question-generation-dialog.tsx`

**Issue:** Line 35 imports `programmingLanguages` from static data

```tsx
import { programmingLanguages } from "../positions/data";
```

**Usage:** Lines 276-280 - renders language dropdown in code snippet section

```tsx
<SelectField
  control={form.control}
  name="language"
  label="Linguaggio di Programmazione"
  placeholder="Seleziona linguaggio"
>
  {programmingLanguages.map((lang) => (
    <SelectItem key={lang} value={lang}>
      {lang}
    </SelectItem>
  ))}
</SelectField>
```

**Refactoring Plan:**

- Change to client component that accepts `languageOptions` prop
- Identify parent components that render this dialog
- Create necessary server wrappers if needed
- Pass DB-fetched languages as prop

**Parent Components (Need to check):**

- `components/quiz/ai-dialogs.tsx` or similar that uses this dialog

---

## Data Categories Summary

| Category         | DB Seeded | Position Form       | Interviews | Quiz              | Status                                              |
| ---------------- | --------- | ------------------- | ---------- | ----------------- | --------------------------------------------------- |
| skill            | ✅        | ✅ (form-with-data) | ❌         | ⚠️ (code-snippet) | Skills integrated in form, need to check quiz usage |
| soft_skill       | ✅        | ✅ (form-with-data) | ❌         | ❌                | Good                                                |
| contract_type    | ✅        | ✅ (form-with-data) | ❌         | ❌                | Good                                                |
| experience_level | ✅        | ✅ (form-with-data) | ❌         | ❌                | Good                                                |
| framework        | ✅        | ❌ (not used)       | ❌         | ❌                | Seeded but unused                                   |
| database         | ✅        | ❌ (not used)       | ❌         | ❌                | Seeded but unused                                   |
| tool             | ✅        | ❌ (not used)       | ❌         | ❌                | Seeded but unused                                   |

---

## Implementation Priority

### High Priority (Active Static Data Usage)

1. **SearchAndFilterInterviews** - Directly imports and uses programmingLanguages
2. **AIQuestionGenerationDialog** - Directly imports and uses programmingLanguages

### Medium Priority (Verify Consistency)

1. Review all quiz generation components
2. Check if any other filters/selects need reference data

### Low Priority (Cleanup)

1. Remove static data file after full migration
2. Remove unused reference data categories from seeding if not needed

---

## Next Steps

1. **Refactor SearchAndFilterInterviews**

   - Create `search-and-filter-interviews-with-data.tsx` server wrapper
   - Update interviews page to use wrapper
   - Pass language options as prop

2. **Refactor AIQuestionGenerationDialog**

   - Find all parents that use this dialog
   - Pass language options as prop
   - Update parents to fetch data from DB

3. **Verify Quiz Components**

   - Scan all question type forms
   - Check for hardcoded reference data
   - Ensure code-snippet-form is fully integrated

4. **Testing**
   - Verify language filters work correctly
   - Confirm data loads from DB with proper caching
   - Test cache invalidation when reference data is updated

---

## Notes

- The `skill` category might refer to programming skills/languages - verify if this matches the programming languages array usage
- Consider renaming category from "skill" to "programming_language" if it's specifically for code languages
- All refactored components follow the pattern: client component accepts prop → server wrapper fetches from DB → data passed as prop
- Cache strategy: Use `getReferenceDataByCategory("skill")` which has `cacheLife("hours")` + proper cache tags
