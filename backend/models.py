from sqlalchemy import Column, Integer, String
from database import Base
import json

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, index=True)
    grade_id = Column(String, index=True)
    subject_id = Column(String, index=True)
    evaluation_type = Column(String, index=True)
    evaluation_date = Column(String) # YYYY-MM-DD
    scores_json = Column(String)  # We will store the scores dict as a JSON string

    @property
    def scores(self):
        return json.loads(self.scores_json)
        
    @scores.setter
    def scores(self, value):
        self.scores_json = json.dumps(value)

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)

class SystemConfig(Base):
    __tablename__ = "system_config"
    id = Column(Integer, primary_key=True, index=True)
    config_json = Column(String) # Complete config state

