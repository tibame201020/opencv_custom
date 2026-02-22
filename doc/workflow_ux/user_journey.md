# User Journey: Script Equivalent Task (No-Code User)

## Scenario
**User Persona:** "No-Code Automator" (familiar with Zapier/n8n, does not know Python/Go).
**Goal:** Create a workflow: "If Button A is found, Click A. Else, Find Button B. If Found, Click B."
**Constraint:** Zero prior knowledge of expression syntax.

---

## Step 1: Create Project & Workflow
**Action:** User opens app, clicks "New Project", then "New Workflow".
**Screenshot:** `screenshots/02_project_created.png`, `screenshots/03_workflow_editor.png`
**Experience:**
- **Positive:** UI is clean. "New Project" is prominent (once found).
- **Friction:** The empty canvas says "Add first step..." which is helpful.
- **Questions:**
    1. *Do I know what to do?* Yes, the empty state guides me.
    2. *Do I know what connects next?* N/A (Start).
    3. *If it fails?* N/A.

## Step 2: Add "Find Image" Node (Button A)
**Action:** Click "+" button, search "Find Image", select it.
**Experience:**
- **Discovery:** The sidebar search is efficient.
- **Friction:** I see a long list of nodes. I have to know "Find Image" is what I want. Categories are present but visual scanning is dense.
- **Questions:**
    1. *Do I know what this node does?* Yes, "Find Image" is self-explanatory.
    2. *Do I know what connects next?* Yes, likely a logic check or action.
    3. *If it fails?* N/A (Configuration phase).

## Step 3: Configure "Find Image"
**Action:** Click the node. Settings modal opens. Select Image.
**Experience:**
- **Discovery:** I see an "Image" field with a "Select Project Asset" box.
- **Asset Management:** Clicking it opens a modal. It's empty. I drag-and-drop a file. It works.
- **Questions:**
    1. *Do I know what this parameter does?* Yes.
    2. *Do I know what connects next?* Still configuring.
    3. *If it fails?* If upload fails, toast appears.

## Step 4: Add "If Condition" Node
**Action:** Add node "If Condition". Connect "Find Image" to it.
**Experience:**
- **Visuals:** Connecting handles is standard (drag & drop).
- **Confusion:** "Find Image" has one output handle. "If Condition" has one input. Easy.

## Step 5: Configure "If Condition" (CRITICAL FRICTION)
**Action:** Define condition: `If Button A Found == true`.
**Context:** I open the "If Condition" settings.
- **Field 1:** "Value 1". It looks like a text box.
- **Field 2:** "Operator". Defaults to `string:equals`.
- **Field 3:** "Value 2".
**The Problem:**
- I need to reference the "Found" status of the previous node.
- I click the `{}` (Braces) icon next to "Value 1".
- A "Variable Picker" popup appears.
- **BLOCKER:** The list shows "Find Image" -> "No output data".
- **Reason:** The workflow hasn't run yet, so there is no execution state. The picker only shows *runtime* results, not *schema*.
- **User Thought:** "How do I select the variable? Do I have to run it first? But I can't run it because the condition is empty."
- **Guesswork:** I see a placeholder `{{ $json.field }}`. I try typing `{{` manually. No autocomplete.
- **Result:** I am stuck. I likely type `true` or just leave it, causing failure later.
**Questions:**
- **1. Do I know what this node does?** Conceptually, yes.
- **2. Do I know what connects next?** Yes, True/False paths.
- **3. If it fails, do I know why?** **NO.** If I type the wrong variable name (because I can't see it), the error will likely be "undefined" at runtime.

## Step 6: Connect Branches
**Action:** Connect "True" to "Click A", "False" to "Find B".
**Experience:**
- **Visuals:** "If Condition" node has labels "True" and "False" next to output handles.
- **Positive:** This is clear. Top is True, Bottom is False.
- **Questions:**
    1. *Do I know what this node does?* Yes.
    2. *Do I know what connects next?* Yes, labels guide me.
    3. *If it fails?* N/A.

## Step 7: Debugging
**Action:** Run Workflow.
**Experience:**
- If I managed to guess `{{ $node["Find Image"].output.found }}`, it runs.
- **Inspector:** Opens automatically. I can see the steps.
- **Trace:** Edges light up (Green/Blue).
- **Confusion:** If "Find Image" fails (not found), does it error out or return `found: false`?
- **Analysis:** `find_image` returns `found: boolean`. It does *not* throw an exception on "not found".
- **Feedback:** User sees the flow go to "False" path. This is good.

---

## Summary of Pain Points

1.  **Variable Discovery (High Severity):** The Variable Picker is useless during initial creation because it relies on execution data. Users cannot discover input/output schemas.
2.  **Expression Syntax (Medium Severity):** Users must understand `{{ ... }}` syntax without sufficient guidance or autocomplete.
3.  **Pre-Run Validation:** No way to know if `{{ $node["..."] }}` is valid until runtime error.

## Conclusion
The workflow engine works (Level A), but the User Experience (Level B) for *configuring* logic is broken due to the dependence on runtime data for variable picking.
