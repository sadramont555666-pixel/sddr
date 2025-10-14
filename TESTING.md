Admin Dashboard API – Quick curl Tests

Prereq: authenticated admin cookie in browser; use browser to login as admin, then copy cookies to curl if needed.

1) List students
```bash
curl -sS "http://localhost:4000/api/admin/students?page=1" --cookie cookies.txt | jq -c '{total: .total, first: .items[0]}'
```

2) Toggle suspension
```bash
curl -sS -X POST "http://localhost:4000/api/admin/students/REPLACE_ID/toggle-suspension" --cookie cookies.txt | jq -c '.'
```

3) Reports list (pending)
```bash
curl -sS "http://localhost:4000/api/admin/reports?status=PENDING&page=1" --cookie cookies.txt | jq -c '{total: .total}'
```

4) Get a report
```bash
curl -sS "http://localhost:4000/api/admin/reports/REPLACE_REPORT_ID" --cookie cookies.txt | jq -c '{id: .id, status: .status}'
```

5) Send feedback (approve)
```bash
curl -sS -X POST "http://localhost:4000/api/admin/reports/REPLACE_REPORT_ID/feedback" \
  -H 'Content-Type: application/json' --cookie cookies.txt \
  -d '{"content":"OK","decision":"APPROVED"}' | jq -c '{id: .id, status: .status}'
```

Manual UI
- /admin shows stats + StudentsGrid with pagination
- /admin/students/:id shows ProgressChart + ReportsTable; FeedbackModal approves/rejects and refreshes



