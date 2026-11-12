import os
import re
import json
import difflib
from typing import List, Dict, Any, Optional, Tuple
import pymupdf as fitz
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# PDF Extraction with PyMuPDF
# ============================================================================

def extract_text_from_pdf(file_bytes: bytes) -> Dict[str, Any]:
    """
    Extracts text and page-level metadata from PDF bytes using PyMuPDF.
    Returns:
        {
            "total_pages": int,
            "pages": [{"page_number": int, "text": str}],
            "full_text": str,
            "title_hint": str,
            "metadata": dict
        }
    """
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages_data = []
    full_text_parts = []
    
    meta = doc.metadata or {}
    pdf_title = (meta.get("title") or "").strip()
    
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_num = page_idx + 1
        page_text = page.get_text("text") or ""
        
        pages_data.append({
            "page_number": page_num,
            "text": page_text
        })
        full_text_parts.append(f"--- PAGE {page_num} ---\n{page_text}")
    
    full_text = "\n\n".join(full_text_parts)
    
    # Heuristic title if metadata title is absent or generic
    title_hint = pdf_title
    if not title_hint or len(title_hint) < 4:
        if pages_data and pages_data[0]["text"]:
            first_lines = [line.strip() for line in pages_data[0]["text"].split("\n") if line.strip()]
            for line in first_lines[:5]:
                if len(line) > 10 and not line.lower().startswith(("arxiv:", "http", "doi:", "volume", "journal")):
                    title_hint = line
                    break
    
    if not title_hint:
        title_hint = "Untitled Research Paper"
        
    return {
        "total_pages": len(doc),
        "pages": pages_data,
        "full_text": full_text,
        "title_hint": title_hint,
        "metadata": {
            "title": meta.get("title"),
            "author": meta.get("author"),
            "subject": meta.get("subject"),
            "keywords": meta.get("keywords"),
        }
    }


def parse_pasted_text(text: str) -> Dict[str, Any]:
    """
    Parses pasted text or abstracts into virtual pages or sections.
    """
    cleaned = text.strip()
    # Split into virtual sections/paragraphs (approx. 400 words each for pagination)
    words = cleaned.split()
    chunk_size = 400
    pages_data = []
    
    if len(words) <= chunk_size:
        pages_data.append({"page_number": 1, "text": cleaned})
    else:
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size])
            pages_data.append({
                "page_number": (i // chunk_size) + 1,
                "text": chunk
            })
            
    # Extract title heuristic from first line
    lines = [l.strip() for l in cleaned.split("\n") if l.strip()]
    title_hint = lines[0] if lines else "Pasted Research Abstract"
    if len(title_hint) > 120:
        title_hint = title_hint[:117] + "..."
        
    return {
        "total_pages": len(pages_data),
        "pages": pages_data,
        "full_text": cleaned,
        "title_hint": title_hint,
        "metadata": {"source": "pasted_text"}
    }


# ============================================================================
# Evidence Quote Verification Algorithm
# ============================================================================

def normalize_text_for_matching(text: str) -> str:
    """
    Normalizes text by removing punctuation, converting to lower case,
    and stripping whitespace / newlines / soft hyphens.
    """
    if not text:
        return ""
    # Replace soft hyphens and line-break hyphens
    t = text.replace("\xad", "").replace("-\n", "").replace("- \n", "")
    # Normalize whitespaces and newlines
    t = re.sub(r"\s+", " ", t)
    # Remove smart quotes and standard quotes
    t = t.replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")
    return t.strip().lower()


def validate_quote_against_pages(quote: str, pages: List[Dict[str, Any]], page_hint: Optional[int] = None) -> Dict[str, Any]:
    """
    Validates whether an AI-generated quote actually exists verbatim (or near verbatim)
    in the original paper text across all pages.
    
    Returns:
        {
            "is_verified": bool,
            "evidence_type": "DIRECT_EVIDENCE" | "AI_INTERPRETATION",
            "page": Optional[int],
            "match_score": float, # 0.0 to 1.0
            "matched_text": Optional[str],
            "verification_note": str
        }
    """
    if not quote or len(quote.strip()) < 8:
        return {
            "is_verified": False,
            "evidence_type": "AI_INTERPRETATION",
            "page": None,
            "match_score": 0.0,
            "matched_text": None,
            "verification_note": "No verifiable quote provided by AI (paraphrased claim)."
        }

    norm_quote = normalize_text_for_matching(quote)
    # Strip leading/trailing quote characters
    norm_quote = re.sub(r'^[\'"“‘\s]+|[\'"”’\s]+$', '', norm_quote)
    
    if len(norm_quote) < 8:
        return {
            "is_verified": False,
            "evidence_type": "AI_INTERPRETATION",
            "page": None,
            "match_score": 0.0,
            "matched_text": None,
            "verification_note": "Quote too short for reliable document validation."
        }

    # 1. First search: Prioritize page_hint if valid, then check all pages
    ordered_pages = []
    if page_hint and 1 <= page_hint <= len(pages):
        ordered_pages.append(pages[page_hint - 1])
    for p in pages:
        if not page_hint or p["page_number"] != page_hint:
            ordered_pages.append(p)

    # 2. Exact normalized substring match
    for p in ordered_pages:
        norm_page = normalize_text_for_matching(p["text"])
        if norm_quote in norm_page:
            # Found exact match
            # Locate snippet in raw page text for context
            idx = norm_page.find(norm_quote)
            start_pos = max(0, idx - 40)
            end_pos = min(len(norm_page), idx + len(norm_quote) + 40)
            matched_snippet = norm_page[start_pos:end_pos]
            
            return {
                "is_verified": True,
                "evidence_type": "DIRECT_EVIDENCE",
                "page": p["page_number"],
                "match_score": 1.0,
                "matched_text": quote.strip(),
                "verification_note": f"Verified verbatim on Page {p['page_number']}."
            }

    # 3. Fuzzy sub-sequence / sliding window match for OCR / hyphenation tolerance
    best_score = 0.0
    best_page = None
    best_match_text = None

    quote_words = norm_quote.split()
    quote_len_words = len(quote_words)
    
    # Only perform sliding window if quote has sufficient words
    if quote_len_words >= 4:
        for p in ordered_pages:
            norm_page = normalize_text_for_matching(p["text"])
            page_words = norm_page.split()
            if not page_words:
                continue

            # Slide over words with window size ~ quote length
            step = max(1, quote_len_words // 2)
            window_size = quote_len_words + 4
            for w_idx in range(0, len(page_words), step):
                window_slice = page_words[w_idx:w_idx + window_size]
                if not window_slice:
                    break
                candidate_text = " ".join(window_slice)
                
                # Check quick similarity ratio
                ratio = difflib.SequenceMatcher(None, norm_quote, candidate_text).ratio()
                if ratio > best_score:
                    best_score = ratio
                    best_page = p["page_number"]
                    best_match_text = candidate_text
                    
                if best_score >= 0.88:
                    break
            if best_score >= 0.88:
                break

    # Evaluation threshold
    if best_score >= 0.84:
        return {
            "is_verified": True,
            "evidence_type": "DIRECT_EVIDENCE",
            "page": best_page,
            "match_score": round(best_score, 2),
            "matched_text": quote.strip(),
            "verification_note": f"Directly supported with {int(best_score * 100)}% textual match on Page {best_page}."
        }
    else:
        return {
            "is_verified": False,
            "evidence_type": "AI_INTERPRETATION",
            "page": page_hint if page_hint else None,
            "match_score": round(best_score, 2),
            "matched_text": None,
            "verification_note": "AI synthesis or paraphrase. Exact quote not found verbatim in original document."
        }


def process_and_verify_analysis(data: Dict[str, Any], pages: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Recursively inspects the analysis structure, validates all evidence items,
    updates verification flags, and calculates statistical metrics.
    """
    total_quotes = 0
    verified_quotes = 0
    ai_interpretations = 0

    def verify_evidence_obj(ev: Any) -> Dict[str, Any]:
        nonlocal total_quotes, verified_quotes, ai_interpretations
        if not isinstance(ev, dict):
            return {
                "claim": str(ev),
                "quote": "",
                "page": None,
                "is_verified": False,
                "evidence_type": "AI_INTERPRETATION",
                "verification_note": "AI Interpretation without specific quote."
            }
            
        quote = ev.get("quote", "")
        hint = ev.get("page") or ev.get("page_hint")
        val_result = validate_quote_against_pages(quote, pages, hint)
        
        total_quotes += 1
        if val_result["is_verified"]:
            verified_quotes += 1
        else:
            ai_interpretations += 1
            
        return {
            "claim": ev.get("claim", ""),
            "quote": quote,
            "page": val_result["page"],
            "is_verified": val_result["is_verified"],
            "evidence_type": val_result["evidence_type"],
            "match_score": val_result["match_score"],
            "verification_note": val_result["verification_note"]
        }

    # Verify Research Problem Evidence
    if "research_problem" in data and isinstance(data["research_problem"], dict):
        prob = data["research_problem"]
        if "evidence" in prob and isinstance(prob["evidence"], list):
            prob["evidence"] = [verify_evidence_obj(e) for e in prob["evidence"]]

    # Verify Methodology Evidence
    if "methodology" in data and isinstance(data["methodology"], dict):
        meth = data["methodology"]
        if "evidence" in meth and isinstance(meth["evidence"], list):
            meth["evidence"] = [verify_evidence_obj(e) for e in meth["evidence"]]

    # Verify Key Findings Evidence
    if "key_findings" in data and isinstance(data["key_findings"], list):
        for finding in data["key_findings"]:
            if isinstance(finding, dict) and "evidence" in finding:
                finding["evidence"] = verify_evidence_obj(finding["evidence"])

    # Verify Limitations Evidence
    if "limitations" in data and isinstance(data["limitations"], list):
        for lim in data["limitations"]:
            if isinstance(lim, dict) and "evidence" in lim:
                lim["evidence"] = verify_evidence_obj(lim["evidence"])

    # Attach Document Meta and Verification Audit Stats
    data["verification_audit"] = {
        "total_claims_evaluated": total_quotes,
        "verified_direct_quotes": verified_quotes,
        "ai_interpretations": ai_interpretations,
        "direct_evidence_rate_pct": round((verified_quotes / total_quotes * 100), 1) if total_quotes > 0 else 0.0
    }
    
    return data


# ============================================================================
# OpenAI Analysis Engine
# ============================================================================

SYSTEM_PROMPT = """
You are PaperLens, an elite academic research simplifier and evidence verifier.
Your task is to transform dense, technical academic research papers into clear, intuitive, and accurate plain-language breakdowns.

CRITICAL INTEGRITY RULES:
1. Always distinguish DIRECT EVIDENCE from AI INTERPRETATION.
2. For direct evidence quotes, cite the EXACT verbatim phrase or sentence from the paper text whenever possible.
3. If an explanation is an analogy, context, or simplification generated by you, clearly provide it as your interpretation.
4. Provide structured JSON matching the requested schema exactly.

JSON Schema format:
{
  "paper_title": "Clean, simplified title or actual paper title",
  "authors_and_venue": "Authors, publication venue, or year if mentioned",
  "one_sentence_takeaway": "A punchy, jargon-free 1-sentence bottom-line conclusion.",
  "summary": {
    "plain_english": "A 2 to 3 paragraph friendly, crystal-clear explanation suitable for an intelligent student or engineer.",
    "real_world_impact": "Why this matters in practice outside the lab.",
    "target_audience": "Who should care (e.g. data scientists, medical researchers, everyday users)."
  },
  "research_problem": {
    "core_problem": "The fundamental bottleneck or obstacle this paper solves.",
    "motivation": "Why solving this problem is urgent or valuable.",
    "prior_work_flaws": "Why existing traditional approaches were inadequate.",
    "evidence": [
      {
        "claim": "Statement of problem supported by the text",
        "quote": "Exact verbatim quote from the paper",
        "page_hint": 1
      }
    ]
  },
  "methodology": {
    "approach_name": "Name of the model, algorithm, or methodology (e.g. Transformer, Double-blind Trial)",
    "overview": "High-level architectural or experimental intuition in plain language.",
    "steps": [
      {
        "step_number": 1,
        "name": "Step Name",
        "explanation": "What this step does and why."
      }
    ],
    "datasets_and_benchmarks": ["Dataset or benchmark 1", "Hardware or baseline 2"],
    "evidence": [
      {
        "claim": "Methodological claim",
        "quote": "Exact verbatim quote explaining architecture or process",
        "page_hint": 2
      }
    ]
  },
  "key_findings": [
    {
      "title": "Finding Title",
      "result_metric": "e.g., 28.4 BLEU score, 3.5x speedup, 94% accuracy",
      "ai_interpretation": "Plain-English interpretation of what this result means.",
      "evidence": {
        "claim": "Empirical claim made by authors",
        "quote": "Exact quote from results section",
        "page_hint": 3
      }
    }
  ],
  "limitations": [
    {
      "title": "Limitation Title",
      "description": "Limitation or constraint acknowledged by the authors.",
      "future_direction": "Suggested future work or open question.",
      "evidence": {
        "claim": "Constraint stated in paper",
        "quote": "Exact quote acknowledging constraint or assumption",
        "page_hint": 4
      }
    }
  ],
  "technical_terms": [
    {
      "term": "Technical Jargon",
      "academic_definition": "Precise scholarly definition.",
      "everyday_analogy": "An intuitive real-world analogy (e.g. like a librarian sorting cards).",
      "simple_explanation": "Simple 1-2 sentence definition without dense math."
    }
  ]
}
"""

def analyze_with_openai(full_text: str, pages: List[Dict[str, Any]], title_hint: str) -> Dict[str, Any]:
    """
    Calls OpenAI API to generate structured simplification and citations,
    then rigorously validates every quote against the source pages.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or api_key == "your_openai_api_key_here":
        raise ValueError("OPENAI_API_KEY is not configured. Please add your key in backend/.env")
        
    model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
    
    from openai import OpenAI
    client = OpenAI(api_key=api_key)
    
    # Cap text length to avoid token limits while keeping rich context
    # Usually ~18,000 words is well within gpt-4o / gpt-4o-mini's 128k context window
    truncated_text = full_text[:90000]
    
    user_prompt = f"""
Please analyze this research paper titled/starting with: '{title_hint}'.
Extract all required components following the schema strictly.
Include exact verbatim quotes from the text with page hints so they can be validated against the source.

PAPER TEXT CONTENT:
{truncated_text}
"""

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.2
    )
    
    content = response.choices[0].message.content
    parsed_json = json.loads(content)
    
    # Now run our verification engine against the original pages!
    verified_data = process_and_verify_analysis(parsed_json, pages)
    verified_data["mode"] = "live_openai"
    verified_data["model_used"] = model_name
    return verified_data


# ============================================================================
# High-Fidelity Fallback & Demo Mode
# ============================================================================

def get_demo_analysis_for_text(full_text: str, pages: List[Dict[str, Any]], title_hint: str) -> Dict[str, Any]:
    """
    Generates a high-quality demonstration analysis when no OpenAI key is set.
    Extracts real quotes from the provided text so that the quote verification
    system actively runs and validates genuine quotes from the user's paper!
    """
    first_page_text = pages[0]["text"] if pages else full_text
    
    # Extract real sentences from the user's uploaded document to demonstrate true validation
    sentences = [s.strip() for s in re.split(r'\. |\.\n', first_page_text) if len(s.strip()) > 25 and len(s.strip()) < 180]
    
    quote1 = sentences[0] if len(sentences) > 0 else "Research paper analyzed via PaperLens pipeline."
    quote2 = sentences[1] if len(sentences) > 1 else "Empirical evaluations demonstrate consistent performance advantages."
    quote3 = sentences[2] if len(sentences) > 2 else "Future research should address computational scaling requirements."
    
    # Intentionally include one AI synthesized quote to demonstrate the difference!
    hallucinated_quote = "This paper decisively solves all artificial intelligence hurdles with zero computational cost."

    demo_data = {
        "paper_title": title_hint if title_hint else "Attention Is All You Need",
        "authors_and_venue": "Democratizing Academic Research – PaperLens Simplifier",
        "one_sentence_takeaway": "Replaces complex recurrence and convolutions with a unified self-attention mechanism, dramatically speeding up training while achieving state-of-the-art accuracy.",
        "summary": {
            "plain_english": "Most traditional machine learning models processed text sequentially from left to right—much like reading one letter at a time through a tiny straw. This made understanding long paragraphs slow and caused models to forget details from earlier sentences.\n\nThis paper introduces the Transformer architecture, which inspects all words in a sentence simultaneously. By using 'Self-Attention', the model connects related words regardless of their distance (for example, understanding that 'it' refers to 'the dog' across a long paragraph).",
            "real_world_impact": "This breakthrough powered modern AI systems including ChatGPT, Google Gemini, machine translation engines, and protein folding prediction.",
            "target_audience": "AI practitioners, software engineers, and domain researchers seeking faster sequence modeling."
        },
        "research_problem": {
            "core_problem": "Sequential computational bottlenecks in recurrent neural networks (RNNs and LSTMs) that prevent parallel training on modern GPUs.",
            "motivation": "Training state-of-the-art language models on massive web-scale corpora took weeks or months because recurrent architectures could not process words concurrently.",
            "prior_work_flaws": "Sequential dependencies precluded parallelization over training examples, and signal decay degraded long-range context retention.",
            "evidence": [
                {
                    "claim": "Sequential computation forms an inherent barrier to parallelized processing.",
                    "quote": quote1,
                    "page_hint": 1
                },
                {
                    "claim": "Traditional sequence models struggle to retain long-range token relationships.",
                    "quote": quote2,
                    "page_hint": 1
                }
            ]
        },
        "methodology": {
            "approach_name": "Multi-Head Self-Attention Transformer Pipeline",
            "overview": "An encoder-decoder framework relying entirely on attention mechanisms to compute representations without recurrent layers or convolutions.",
            "steps": [
                {
                    "step_number": 1,
                    "name": "Positional Encoding",
                    "explanation": "Because words are processed simultaneously, sine and cosine mathematical waves are injected into word vectors to preserve word order."
                },
                {
                    "step_number": 2,
                    "name": "Multi-Head Attention",
                    "explanation": "Splits queries, keys, and values into parallel projection spaces so the model attends to grammar, semantics, and context all at once."
                },
                {
                    "step_number": 3,
                    "name": "Feed-Forward & Normalization",
                    "explanation": "Passes each position through identical sub-layers with residual connections and layer normalization for stable gradient flow."
                }
            ],
            "datasets_and_benchmarks": [
                "WMT 2014 English-to-German (4.5 million sentence pairs)",
                "WMT 2014 English-to-French (36 million sentence pairs)",
                "8 NVIDIA P100 GPUs"
            ],
            "evidence": [
                {
                    "claim": "Self-attention computes relational weights between all positions in a sequence in parallel.",
                    "quote": quote1,
                    "page_hint": 1
                }
            ]
        },
        "key_findings": [
            {
                "title": "State-of-the-Art Translation Benchmark",
                "result_metric": "28.4 BLEU on English-to-German (improving by +2.0 over previous best)",
                "ai_interpretation": "The model achieved significantly more fluent, grammatically accurate translations in fewer training steps.",
                "evidence": {
                    "claim": "Outperforms existing best models at a fraction of the training cost.",
                    "quote": quote2,
                    "page_hint": 1
                }
            },
            {
                "title": "Dramatic Training Speedup",
                "result_metric": "Trained in just 3.5 days on 8 GPUs",
                "ai_interpretation": "Eliminating recurrence enables near-linear hardware acceleration across GPU clusters.",
                "evidence": {
                    "claim": "Training time is reduced by orders of magnitude compared to recurrent or convolutional alternatives.",
                    "quote": quote2,
                    "page_hint": 1
                }
            }
        ],
        "limitations": [
            {
                "title": "Quadratic Memory Complexity with Sequence Length",
                "description": "Attention matrix computation scales with O(N^2) memory regarding token count, making extremely long documents memory-intensive.",
                "future_direction": "Explore sparse attention patterns, linear approximations, or recurrent memory windows for book-length documents.",
                "evidence": {
                    "claim": "Memory growth per sequence step remains a computational challenge.",
                    "quote": quote3,
                    "page_hint": 1
                }
            },
            {
                "title": "Hypothetical Unsubstantiated Claim (Demonstration)",
                "description": "Example showing how PaperLens detects AI hallucination when a quote is not present in the document.",
                "future_direction": "Verification checks flag unverified citations automatically.",
                "evidence": {
                    "claim": "Claims zero cost inference across all devices.",
                    "quote": hallucinated_quote,
                    "page_hint": 1
                }
            }
        ],
        "technical_terms": [
            {
                "term": "Self-Attention",
                "academic_definition": "An attention mechanism relating different positions of a single sequence in order to compute a representation of the sequence.",
                "everyday_analogy": "Imagine a highlighter that lights up connected words across a sentence simultaneously, linking 'it' to 'the dog' instantly.",
                "simple_explanation": "A way for an AI to score which other words in a sentence are most relevant to the current word."
            },
            {
                "term": "Positional Encoding",
                "academic_definition": "Fixed or learned vectors added to token embeddings to encode sequence order information without recurrence.",
                "everyday_analogy": "Like numbering index cards so that even if you throw them on a table all at once, you still know which card came first.",
                "simple_explanation": "A numerical tag that reminds the computer in what order words were originally spoken or typed."
            },
            {
                "term": "BLEU Score",
                "academic_definition": "Bilingual Evaluation Understudy: an algorithm for evaluating the quality of text which has been machine-translated.",
                "everyday_analogy": "A referee grading a translation against a professional human translator's rubric.",
                "simple_explanation": "A score from 0 to 100 measuring how closely machine-generated text matches human translation."
            },
            {
                "term": "Residual Connection",
                "academic_definition": "A skip-connection that bypasses one or more layers by adding the input directly to the layer output.",
                "everyday_analogy": "An express elevator in a skyscraper that lets information skip crowded intermediate floors without losing clarity.",
                "simple_explanation": "A shortcut route for signals that keeps deep networks from forgetting early information."
            }
        ]
    }

    verified_data = process_and_verify_analysis(demo_data, pages)
    verified_data["mode"] = "demo_mode"
    verified_data["demo_note"] = "Running in Demo Mode using extracted paper quotes. Set OPENAI_API_KEY in backend/.env for live OpenAI model generation."
    return verified_data


def analyze_paper_content(full_text: str, pages: List[Dict[str, Any]], title_hint: str) -> Dict[str, Any]:
    """
    Main orchestration entry point:
    Attempts OpenAI analysis if key is set; gracefully falls back to intelligent
    verified demo analysis if key is missing or invalid.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if api_key and api_key != "your_openai_api_key_here":
        try:
            return analyze_with_openai(full_text, pages, title_hint)
        except Exception as e:
            print(f"[Warning] OpenAI API call failed ({e}). Falling back to verifiable analysis.")
            res = get_demo_analysis_for_text(full_text, pages, title_hint)
            res["api_error_fallback"] = str(e)
            return res
    else:
        return get_demo_analysis_for_text(full_text, pages, title_hint)
