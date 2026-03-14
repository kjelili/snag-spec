import docx
import sys

try:
    doc = docx.Document('snag spec.docx')
    output = []
    for para in doc.paragraphs:
        if para.text.strip():
            output.append(para.text)
    
    # Write to file to avoid encoding issues
    with open('doc_content.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output))
    
    print('\n'.join(output))
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
