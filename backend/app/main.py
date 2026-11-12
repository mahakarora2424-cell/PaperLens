import os
import time
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pymupdf as fitz
from dotenv import load_dotenv

from app.analyzer import (
    extract_text_from_pdf,
    parse_pasted_text,
    analyze_paper_content,
    validate_quote_against_pages
)

load_dotenv()

app = FastAPI(
    title="PaperLens API",
    description="Backend API for PaperLens – Research Paper Simplifier & Evidence Verifier",
    version="1.0.0"
)

# Enable CORS for Vite frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Start time for health check
SERVER_START_TIME = time.time()


class TextAnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=20, description="Pasted research paper text or abstract")
    title: Optional[str] = Field(None, description="Optional title or topic")


class QuoteVerifyRequest(BaseModel):
    quote: str = Field(..., description="The quote to verify against document text")
    page_hint: Optional[int] = Field(None, description="Optional page hint")


@app.get("/")
def root():
    return {
        "app": "PaperLens – Research Paper Simplifier",
        "status": "online",
        "docs_url": "/docs"
    }


@app.get("/api/health")
def health_check():
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    has_api_key = bool(api_key and api_key != "your_openai_api_key_here")
    
    return {
        "status": "healthy",
        "service": "PaperLens Backend",
        "uptime_seconds": round(time.time() - SERVER_START_TIME, 1),
        "pymupdf_version": getattr(fitz, "__version__", "installed"),
        "openai_configured": has_api_key,
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    }


@app.get("/api/sample")
def get_sample_paper():
    """
    Returns an academic sample text (The seminal Attention Is All You Need paper)
    for quick one-click testing in the UI.
    """
    sample_text = """Attention Is All You Need
Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin

Abstract:
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs, a small fraction of the training costs of the best models from the literature.

1 Introduction:
Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Numerous efforts have since continued to push the boundaries of recurrent language models and encoder-decoder architectures.
Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states ht, as a function of the previous hidden state ht-1 and the input for position t. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples.
Recent work has achieved significant improvements in computational efficiency through factorization tricks and conditional computation, while also improving model performance in case of the latter. However, the fundamental constraint of sequential computation remains.

Attention mechanisms have become an integral part of compelling sequence modeling and transduction models in various tasks, allowing modeling of dependencies without regard to their distance in the input or output sequences. In all but a few cases, however, such attention mechanisms are used in conjunction with a recurrent network.
In this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output. The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs."""
    
    return {
        "title": "Attention Is All You Need (Vaswani et al.)",
        "text": sample_text
    }


@app.post("/api/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    """
    Accepts an uploaded PDF research paper, extracts text with PyMuPDF,
    runs the simplifier, and validates all evidence quotes.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a PDF document (.pdf)."
        )
        
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF file is empty."
            )
        if len(content) > 30 * 1024 * 1024:  # 30 MB limit
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds maximum limit of 30 MB."
            )

        # Extract pages with PyMuPDF
        pdf_data = extract_text_from_pdf(content)
        
        if not pdf_data["full_text"].strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not extract readable text from this PDF. It may be a scanned image without an OCR text layer."
            )

        # Run simplification and quote verification
        analysis = analyze_paper_content(
            full_text=pdf_data["full_text"],
            pages=pdf_data["pages"],
            title_hint=pdf_data["title_hint"] or file.filename.replace(".pdf", "")
        )

        # Append source document metadata
        analysis["document_meta"] = {
            "source_type": "pdf",
            "filename": file.filename,
            "total_pages": pdf_data["total_pages"],
            "total_characters": len(pdf_data["full_text"]),
            "word_count": len(pdf_data["full_text"].split()),
            "title_hint": pdf_data["title_hint"],
            "metadata": pdf_data["metadata"]
        }

        return analysis

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing the PDF: {str(e)}"
        )


@app.post("/api/analyze-text")
async def analyze_text(payload: TextAnalyzeRequest):
    """
    Accepts pasted research text or abstract, partitions into virtual pages,
    runs the simplifier, and validates all evidence quotes.
    """
    try:
        text = payload.text.strip()
        if len(text) < 30:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide at least 30 characters of research paper text or abstract."
            )

        parsed_doc = parse_pasted_text(text)
        title = payload.title or parsed_doc["title_hint"]

        analysis = analyze_paper_content(
            full_text=parsed_doc["full_text"],
            pages=parsed_doc["pages"],
            title_hint=title
        )

        analysis["document_meta"] = {
            "source_type": "text",
            "filename": "Pasted Research Text",
            "total_pages": parsed_doc["total_pages"],
            "total_characters": len(text),
            "word_count": len(text.split()),
            "title_hint": title,
            "metadata": parsed_doc["metadata"]
        }

        return analysis

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while analyzing text: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=True)
