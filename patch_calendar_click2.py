import sys
import re

with open('src/widgets/calendar/ui/CalendarSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"router\.push\(`/\?jurnalId=\$\{evt\.id\}`\);"
replacement = r"router.push(`/?q=${encodeURIComponent(evt.judul)}#section-arsip`);"

new_content = re.sub(pattern, replacement, content)

if content == new_content:
    print("Failed to replace!")
else:
    print("Success!")
    with open('src/widgets/calendar/ui/CalendarSection.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)

