import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
from sentence_transformers import CrossEncoder
import json
from transformers import BertTokenizer, BertForSequenceClassification

class PipeLine:
  def __init__(self):
    #Natural Language Inference
    self.nli_name = "MoritzLaurer/deberta-v3-base-mnli-fever-anli" #alternative model: "roberta-large-mnli"
    self.nli_tokenizer = AutoTokenizer.from_pretrained(self.nli_name)
    self.nli_model = AutoModelForSequenceClassification.from_pretrained(self.nli_name)
    self.nli_model.eval()

    #Question Natural Language Inference
    self.qnli_name = "cross-encoder/qnli-distilroberta-base"
    self.qnli_model = CrossEncoder(self.qnli_name)

    #Question-Answering
    self.qa_pipeline = pipeline(
    "question-answering",
    model="deepset/deberta-v3-large-squad2"
    )
    #Bert fined-tuned with Bloom's Taxonomy Level
    self.model_path = 'bloom_taxonomy_model'

    self.bert_model = BertForSequenceClassification.from_pretrained(self.model_path)
    self.bert_tokenizer = BertTokenizer.from_pretrained(self.model_path)
    self.bert_model.eval()

    with open(f'{self.model_path}/label_mapping.json', 'r') as f:
        self.mapping = json.load(f)
        self.id_to_label = self.mapping['id_to_label']

  def bloom_score(self,question):
    inputs = self.bert_tokenizer(question, return_tensors="pt", truncation=True, padding=True, max_length=128)

    with torch.no_grad():
        outputs = self.bert_model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
        pred_idx = torch.argmax(probs, dim=1).item()

    return self.id_to_label[str(pred_idx)], probs[0][pred_idx].item()

  def nli_score(self, context, hypothesis):
      inputs = self.nli_tokenizer(
          context,
          hypothesis,
          return_tensors="pt",
          truncation=True
          )

      with torch.no_grad():
          logits = self.nli_model(**inputs).logits
          probs = F.softmax(logits, dim=-1)[0]
      return probs


  def qnli_score(self, question, answer):
    score = self.qnli_model.predict([(question, answer)])[0]
    return torch.sigmoid(torch.tensor(score)).item()

  def qa_score(self, context, question, answer):
    qa_result = self.qa_pipeline(question=question, context=context)
    expected_answer = qa_result['answer']


    forward = self.nli_score(expected_answer, answer)
    backward = self.nli_score(answer, expected_answer)

    return max(forward[0], backward[0]), expected_answer


  def evaluate(self, story, question, answer):
    story_score = self.nli_score(story, answer)
    qnli_score = self.qnli_score(question, answer)
    qa_score = self.qa_score(story, question, answer)

    # Change the index based on the model used:
    #   roberta:0=contradiction, 1=neutral, 2=entailment
    #   deberta:2=contradiction, 1=neutral, 0=entailment

    story_entailment = story_score[0].item()
    story_neutral = story_score[1].item()
    story_contradiction = story_score[2].item()

    #answer_entailment = qa_score[0][0].item()
    #answer_neutral = qa_score[0][1].item()
    #answer_contradiction = qa_score[0][2].item()

    answer_entailment = qa_score[0].item()

    bloom_category, bloom_confidence = self.bloom_score(question)

    # Baseline - 0.6
    is_grounded = story_entailment > 0.6 #is it based on the context
    is_relevant = qnli_score > 0.6 #is the answer addressing the question
    is_similar = answer_entailment > 0.6 #is the answer similar to the generated answer
    is_correct = is_relevant and is_grounded and is_similar

    return {
        "story_entailment": story_entailment,
        "story_neutral": story_neutral,
        "story_contradiction": story_contradiction,
        "answer_entailment": answer_entailment,
        #"answer_neutral": answer_neutral,
        #"answer_contradiction": answer_contradiction,
        "question_relevance": qnli_score,
        "expected_answer": qa_score[1],
        "is_grounded": int(is_grounded),
        "is_relevant": int(is_relevant),
        "is_similar": int(is_correct),
        "is_correct": int(is_correct),
        "bloom_category": bloom_category,
        "bloom_confidence": bloom_confidence
    }
