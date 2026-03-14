import json
import re
from datetime import UTC, datetime

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


BASE_URL = "http://localhost:3000"


def get_error_messages(page):
    patterns = [
        "Unable to load project metadata",
        "Required setup data is missing",
        "Failed to create snag",
        "Unable to refresh snag details",
        "Clause suggestions are currently unavailable",
        "Unable to generate instruction",
        "Unable to refresh this instruction",
        "Action failed",
        "Instruction not found",
        "Snag not found",
    ]
    found = []
    for text in patterns:
        try:
            if page.get_by_text(text, exact=False).first.is_visible():
                found.append(text)
        except Exception:
            continue
    return found


def main():
    results = {
        "timestamp": datetime.now(UTC).isoformat(),
        "steps": [],
        "visible_ui_errors": [],
        "final_instruction_status": None,
        "created_snag_url": None,
        "instruction_url": None,
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page()
        page.set_default_timeout(20000)

        try:
            # Step 1: Landing page hero/CTA renders
            page.goto(BASE_URL, wait_until="domcontentloaded")
            hero_ok = page.get_by_role("heading", name=re.compile("Faster defect resolution", re.I)).is_visible()
            cta_ok = page.get_by_role("link", name=re.compile("Create first snag", re.I)).is_visible()
            step1_success = hero_ok and cta_ok
            results["steps"].append(
                {
                    "step": 1,
                    "name": "Landing hero/CTA render",
                    "success": step1_success,
                    "details": {
                        "hero_visible": hero_ok,
                        "cta_visible": cta_ok,
                        "url": page.url,
                    },
                }
            )
            results["visible_ui_errors"].extend(get_error_messages(page))

            # Step 2: Open create snag and validate selector population
            page.goto(f"{BASE_URL}/app/snags/new", wait_until="domcontentloaded")
            page.get_by_role("heading", name=re.compile("Create New Snag", re.I)).wait_for(state="visible")

            # Wait briefly for async metadata to populate select options.
            page.wait_for_function(
                """
                () => {
                  const ids = ['project_id', 'contract_id', 'defect_type_id', 'created_by'];
                  return ids.every((id) => {
                    const el = document.getElementById(id);
                    return el && el.querySelectorAll('option').length > 1;
                  });
                }
                """,
                timeout=10000,
            )

            project_count = page.locator("#project_id option").count()
            contract_count = page.locator("#contract_id option").count()
            defect_count = page.locator("#defect_type_id option").count()
            user_count = page.locator("#created_by option").count()

            selectors_populated = (
                project_count > 1 and contract_count > 1 and defect_count > 1 and user_count > 1
            )
            results["steps"].append(
                {
                    "step": 2,
                    "name": "Selectors populated on /app/snags/new",
                    "success": selectors_populated,
                    "details": {
                        "project_options": project_count,
                        "contract_options": contract_count,
                        "defect_type_options": defect_count,
                        "user_options": user_count,
                    },
                }
            )
            results["visible_ui_errors"].extend(get_error_messages(page))

            # Step 3: Create a new snag
            page.fill("#title", "UI Smoke Test Snag")
            page.fill(
                "#description",
                "Small sample text for UI smoke test snag creation.",
            )
            page.get_by_role("button", name=re.compile("Create Snag", re.I)).click()
            page.wait_for_url(re.compile(r".*/app/snags/[0-9a-fA-F-]+$"))
            snag_url = page.url
            results["created_snag_url"] = snag_url
            results["steps"].append(
                {
                    "step": 3,
                    "name": "Create new snag",
                    "success": True,
                    "details": {"snag_url": snag_url},
                }
            )
            results["visible_ui_errors"].extend(get_error_messages(page))

            # Step 4: Generate instruction from snag detail
            page.get_by_role("button", name=re.compile("Generate Architect", re.I)).click()
            page.wait_for_url(re.compile(r".*/app/instructions/[0-9a-fA-F-]+$"))
            instruction_url = page.url
            results["instruction_url"] = instruction_url
            results["steps"].append(
                {
                    "step": 4,
                    "name": "Generate instruction from snag detail",
                    "success": True,
                    "details": {"instruction_url": instruction_url},
                }
            )
            results["visible_ui_errors"].extend(get_error_messages(page))

            # Step 5: Send for Review -> Approve -> Issue
            send_btn = page.get_by_role("button", name=re.compile("Send for Review", re.I))
            send_btn.wait_for(state="visible")
            send_btn.click()
            page.get_by_role("button", name=re.compile("Approve instruction", re.I)).wait_for(state="visible")

            approve_btn = page.get_by_role("button", name=re.compile("Approve instruction", re.I))
            approve_btn.click()
            page.get_by_role("button", name=re.compile("Issue Instruction", re.I)).wait_for(state="visible")

            issue_btn = page.get_by_role("button", name=re.compile("Issue Instruction", re.I))
            issue_btn.click()

            page.wait_for_timeout(800)
            status_badge_text = page.locator("div.flex.items-center.space-x-3 span").first.inner_text().strip()
            results["final_instruction_status"] = status_badge_text
            step5_success = status_badge_text.lower() == "issued"
            results["steps"].append(
                {
                    "step": 5,
                    "name": "Instruction lifecycle actions",
                    "success": step5_success,
                    "details": {
                        "send_for_review": True,
                        "approve": True,
                        "issue": True,
                        "final_status_badge": status_badge_text,
                    },
                }
            )
            results["visible_ui_errors"].extend(get_error_messages(page))

        except PlaywrightTimeoutError as exc:
            results["steps"].append(
                {
                    "step": "runtime",
                    "name": "Playwright timeout",
                    "success": False,
                    "details": {"error": str(exc), "url": page.url},
                }
            )
        except Exception as exc:  # pragma: no cover
            results["steps"].append(
                {
                    "step": "runtime",
                    "name": "Unhandled exception",
                    "success": False,
                    "details": {"error": str(exc), "url": page.url},
                }
            )
        finally:
            browser.close()

    deduped = []
    seen = set()
    for item in results["visible_ui_errors"]:
        if item not in seen:
            seen.add(item)
            deduped.append(item)
    results["visible_ui_errors"] = deduped

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
