import os
import sys
import PyPDF2
from docx import Document

out_dir = r"C:\Users\trejo\.gemini\antigravity\brain\858712d8-143f-4e70-9963-27a3e290e679\scratch"
os.makedirs(out_dir, exist_ok=True)

files = [
    r"c:\Users\trejo\Desktop\S9\construccion\Parcial II\Proyecto\Documentacion\Grupo02_Taller_3_2.docx (1).pdf",
    r"c:\Users\trejo\Desktop\S9\construccion\Parcial II\Proyecto\Documentacion\Grupo5_Tarea_3_1.docx",
    r"c:\Users\trejo\Desktop\S9\construccion\Parcial II\Proyecto\Documentacion\teoria\Leccion 3.1.2 Tipo de mantenimiento de sw.pdf",
    r"c:\Users\trejo\Desktop\S9\construccion\Parcial II\Proyecto\Documentacion\teoria\Leccion 3.1.3 Control y gestión de mantenimiento de sw.pdf"
]

for file_path in files:
    try:
        base_name = os.path.basename(file_path)
        out_name = os.path.join(out_dir, base_name + ".txt")
        text = ""
        if file_path.endswith('.pdf'):
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
        elif file_path.endswith('.docx'):
            doc = Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
                
        with open(out_name, "w", encoding="utf-8") as out_f:
            out_f.write(text)
        print(f"Extracted: {out_name}")
    except Exception as e:
        print(f"Error extracting {file_path}: {e}")
