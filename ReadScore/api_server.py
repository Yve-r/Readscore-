from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Import the PipeLine class
from PipeLine import PipeLine

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Initialize the pipeline once at startup
print("Loading AI models... This may take a minute...")
pipeline = PipeLine()
print("Models loaded successfully!")

# The reading passage (same as in the frontend)
PASSAGE = """Water is one of the most important resources on Earth. Every living thing — humans, animals, and plants — needs water to survive. However, clean and fresh water is not unlimited. Only about three percent of all water on Earth is fresh water, and most of it is frozen in glaciers and ice caps.

In the Philippines, many communities still struggle with water shortages, especially during dry seasons. Rivers and lakes are sometimes polluted due to improper waste disposal, making the water unsafe to drink. This affects not only the health of the people but also the animals and plants that depend on those water sources.

There are many simple ways we can help save water in our daily lives. Turning off the faucet while brushing teeth, fixing leaky pipes, and collecting rainwater for watering plants are small steps that make a big difference. When everyone works together to conserve water, we help ensure that future generations will also have enough clean water to drink and use."""

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "models_loaded": True})

@app.route('/evaluate', methods=['POST'])
def evaluate_answer():
    """
    Evaluate a single question-answer pair
    Expected JSON:
    {
        "question": "What percentage of Earth's water is fresh water?",
        "answer": "About three percent"
    }
    """
    try:
        data = request.json
        question = data.get('question', '').strip()
        answer = data.get('answer', '').strip()
        
        if not question or not answer:
            return jsonify({"error": "Both question and answer are required"}), 400
        
        # Run the evaluation pipeline
        result = pipeline.evaluate(PASSAGE, question, answer)
        
        return jsonify({
            "success": True,
            "result": result
        })
    
    except Exception as e:
        print(f"Error evaluating answer: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/evaluate_batch', methods=['POST'])
def evaluate_batch():
    """
    Evaluate multiple question-answer pairs at once
    Expected JSON:
    {
        "qa_pairs": [
            {"question": "...", "answer": "..."},
            {"question": "...", "answer": "..."}
        ]
    }
    """
    try:
        data = request.json
        qa_pairs = data.get('qa_pairs', [])
        
        if not qa_pairs:
            return jsonify({"error": "qa_pairs array is required"}), 400
        
        results = []
        for idx, pair in enumerate(qa_pairs):
            question = pair.get('question', '').strip()
            answer = pair.get('answer', '').strip()
            
            if not question or not answer:
                results.append({
                    "question_index": idx,
                    "error": "Empty question or answer",
                    "result": None
                })
                continue
            
            # Run evaluation
            result = pipeline.evaluate(PASSAGE, question, answer)
            results.append({
                "question_index": idx,
                "question": question,
                "answer": answer,
                "result": result
            })
        
        return jsonify({
            "success": True,
            "results": results
        })
    
    except Exception as e:
        print(f"Error in batch evaluation: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/bloom_classify', methods=['POST'])
def bloom_classify():
    """
    Classify a question's Bloom's Taxonomy level
    Expected JSON:
    {
        "question": "What percentage of Earth's water is fresh water?"
    }
    """
    try:
        data = request.json
        question = data.get('question', '').strip()
        
        if not question:
            return jsonify({"error": "Question is required"}), 400
        
        category, confidence = pipeline.bloom_score(question)
        
        return jsonify({
            "success": True,
            "bloom_category": category,
            "bloom_confidence": confidence
        })
    
    except Exception as e:
        print(f"Error classifying question: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print("ReadScore API Server")
    print("="*50)
    print("Server starting on http://localhost:5000")
    print("Endpoints:")
    print("  - POST /evaluate          - Evaluate single Q&A")
    print("  - POST /evaluate_batch    - Evaluate multiple Q&As")
    print("  - POST /bloom_classify    - Classify Bloom's level")
    print("  - GET  /health           - Health check")
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
