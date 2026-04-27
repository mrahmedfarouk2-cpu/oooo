from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import data
import models
from database import engine, get_db, SessionLocal
import json

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Visual Arts Assessment Portal API")

# Allow CORS for local development with Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_default_config():
    return {
        "grades": data.GRADES,
        "subjects": data.SUBJECTS,
        "criteria": {
            "unit": data.UNIT_CRITERIA,
            "final": data.FINAL_DRAWING_CRITERIA,
            "periodic": {
                "saudi_arts": data.PERIODIC_CRITERIA_SAUDI_ARTS,
                "cartoon": data.PERIODIC_CRITERIA_CARTOON,
                "handicrafts": data.PERIODIC_CRITERIA_HANDICRAFTS,
                "digital_drawing": data.PERIODIC_CRITERIA_DIGITAL_DRAWING,
                "default": data.PERIODIC_CRITERIA_DRAWING_GRADE4
            }
        }
    }

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Seed students
        if db.query(models.Student).count() == 0:
            for s in data.MOCK_STUDENTS:
                db.add(models.Student(name=s["name"]))
        
        # Seed config
        if db.query(models.SystemConfig).count() == 0:
            db_config = models.SystemConfig(config_json=json.dumps(get_default_config()))
            db.add(db_config)
            
        db.commit()
    finally:
        db.close()

class StudentCreate(BaseModel):
    name: str

class ConfigUpdate(BaseModel):
    config: Dict[str, Any]

class EvaluationResult(BaseModel):
    student_id: int
    grade_id: str
    subject_id: str
    evaluation_type: str
    evaluation_date: Optional[str] = None
    scores: Dict[str, int]

def get_config_data(db: Session):
    config_entry = db.query(models.SystemConfig).first()
    if config_entry and config_entry.config_json:
        return json.loads(config_entry.config_json)
    return get_default_config()

@app.get("/api/config")
def get_config(db: Session = Depends(get_db)):
    return get_config_data(db)

@app.post("/api/config")
def update_config(payload: ConfigUpdate, db: Session = Depends(get_db)):
    config_entry = db.query(models.SystemConfig).first()
    if not config_entry:
        config_entry = models.SystemConfig()
        db.add(config_entry)
    config_entry.config_json = json.dumps(payload.config)
    db.commit()
    return {"status": "success"}

@app.get("/api/grades")
def get_grades(db: Session = Depends(get_db)):
    return get_config_data(db).get("grades", [])

@app.get("/api/subjects")
def get_subjects(grade_id: Optional[str] = None, db: Session = Depends(get_db)):
    subjects = get_config_data(db).get("subjects", [])
    if grade_id:
        return [s for s in subjects if "grades" not in s or grade_id in s["grades"]]
    return subjects

@app.get("/api/students")
def get_students(db: Session = Depends(get_db)):
    students = db.query(models.Student).all()
    return [{"id": s.id, "name": s.name} for s in students]

@app.post("/api/students")
def create_student(student: StudentCreate, db: Session = Depends(get_db)):
    db_student = models.Student(name=student.name)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return {"id": db_student.id, "name": db_student.name}

@app.delete("/api/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if db_student:
        db.delete(db_student)
        db.commit()
    return {"status": "success"}

@app.get("/api/criteria")
def get_criteria(evaluation_type: str, subject_id: Optional[str] = None, db: Session = Depends(get_db)):
    crit_config = get_config_data(db).get("criteria", {})
    if evaluation_type == "unit":
        return crit_config.get("unit", [])
    elif evaluation_type == "final":
        return crit_config.get("final", [])
    elif evaluation_type == "periodic":
        periodic_crit = crit_config.get("periodic", {})
        if subject_id in periodic_crit:
            return periodic_crit[subject_id]
        else:
            return periodic_crit.get("default", [])
    raise HTTPException(status_code=400, detail="Invalid criteria parameters")

@app.post("/api/evaluations")
def save_evaluation(evaluation: EvaluationResult, db: Session = Depends(get_db)):
    db_eval = models.Evaluation(
        student_id=evaluation.student_id,
        grade_id=evaluation.grade_id,
        subject_id=evaluation.subject_id,
        evaluation_type=evaluation.evaluation_type,
        evaluation_date=evaluation.evaluation_date
    )
    db_eval.scores = evaluation.scores
    db.add(db_eval)
    db.commit()
    db.refresh(db_eval)
    print(f"Saved evaluation {db_eval.id} to database.")
    return {"status": "success", "message": "تم حفظ التقييم بنجاح في قاعدة البيانات"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
