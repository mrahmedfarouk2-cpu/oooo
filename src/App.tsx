/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette, 
  ChevronRight, 
  GraduationCap, 
  ClipboardCheck, 
  Users, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Info,
  Trash2,
  Plus,
  X,
  Pencil,
  Save
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [step, setStep] = useState<'grade' | 'subject' | 'type' | 'student' | 'evaluation'>('grade');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'unit' | 'periodic' | 'final' | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  // Student Management State
  const [showStudentManager, setShowStudentManager] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');

  // Global Config State
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Derived API Data
  const grades = globalConfig?.grades || [];
  const subjects = useMemo(() => {
    if (!globalConfig || !selectedGrade) return [];
    return globalConfig.subjects.filter((s: any) => !s.grades || s.grades.includes(selectedGrade));
  }, [globalConfig, selectedGrade]);

  const currentCriteria = useMemo(() => {
    if (!globalConfig || !selectedType) return [];
    const critConfig = globalConfig.criteria || {};
    if (selectedType === 'unit') return critConfig.unit || [];
    if (selectedType === 'final') return critConfig.final || [];
    if (selectedType === 'periodic') {
      return critConfig.periodic?.[selectedSubject || ''] || critConfig.periodic?.default || [];
    }
    return [];
  }, [globalConfig, selectedType, selectedSubject]);

  const [students, setStudents] = useState<any[]>([]);

  // Scoring state
  const [scores, setScores] = useState<Record<number, number>>({});
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetch(`${API_BASE}/api/config`).then(r => r.json()).then(setGlobalConfig).catch(console.error);
    fetch(`${API_BASE}/api/students`).then(r => r.json()).then(setStudents).catch(console.error);
  }, []);

  const saveConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: globalConfig })
      });
      if (res.ok) {
        setIsEditMode(false);
        alert('تم حفظ التعديلات بنجاح');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الحفظ');
    }
  };

  const handleEditModeToggle = () => {
    if (isEditMode) {
      saveConfig();
    } else {
      const pwd = window.prompt('أدخل كلمة المرور لتفعيل وضع التعديل:');
      if (pwd === '01020') {
        setIsEditMode(true);
      } else if (pwd !== null) {
        alert('كلمة المرور غير صحيحة');
      }
    }
  };

  const updateConfigValue = (path: (string | number)[], newValue: string) => {
    if (!newValue.trim()) return;
    setGlobalConfig((prev: any) => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      let current = newConfig;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = newValue;
      return newConfig;
    });
  };

  const InlineEditBtn = ({ path, value }: { path: (string | number)[], value: string }) => {
    if (!isEditMode) return null;
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          const newVal = window.prompt('تعديل النص:', value);
          if (newVal !== null && newVal.trim() !== '') {
            updateConfigValue(path, newVal);
          }
        }}
        className="p-1.5 mx-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors shrink-0"
        title="تعديل النص"
      >
        <Pencil className="w-3 h-3" />
      </button>
    );
  };

  const getCriteriaPath = (idx: number) => {
    if (selectedType === 'periodic') {
      const subjKey = globalConfig?.criteria?.periodic?.[selectedSubject || ''] ? selectedSubject : 'default';
      return ['criteria', 'periodic', subjKey as string, idx, 'text'];
    }
    return ['criteria', selectedType as string, idx, 'text'];
  };


  const addStudent = async () => {
    if (!newStudentName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStudentName })
      });
      const data = await res.json();
      setStudents([...students, data]);
      setNewStudentName('');
    } catch (e) {
      console.error(e);
    }
  };

  const deleteStudent = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;
    try {
      await fetch(`${API_BASE}/api/students/${id}`, { method: 'DELETE' });
      setStudents(students.filter(s => s.id !== id));
      if (selectedStudent?.id === id) {
        setSelectedStudent(null);
        if (step === 'evaluation') setStep('student');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const reset = () => {
    setStep('grade');
    setSelectedGrade(null);
    setSelectedSubject(null);
    setSelectedType(null);
    setSelectedStudent(null);
    setScores({});
  };

  const handleBack = () => {
    if (step === 'subject') setStep('grade');
    else if (step === 'type') setStep('subject');
    else if (step === 'student') setStep('type');
    else if (step === 'evaluation') setStep('student');
  };

  const totalPossible = useMemo(() => {
    return currentCriteria.reduce((acc, curr) => acc + ((curr as any).max || 4), 0);
  }, [currentCriteria]);

  const currentScore = useMemo(() => {
    return Object.values(scores).reduce((acc, curr) => acc + curr, 0);
  }, [scores]);

  const getCategory = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (selectedType === 'unit') {
      if (score > 15) return { label: 'يتخطى الهدف (موهوب)', color: 'text-purple-600', bg: 'bg-purple-100' };
      if (score >= 12) return { label: 'حقق الهدف', color: 'text-green-600', bg: 'bg-green-100' };
      if (score >= 8) return { label: 'يقترب من الهدف', color: 'text-amber-600', bg: 'bg-amber-100' };
      return { label: 'دون الهدف', color: 'text-red-600', bg: 'bg-red-100' };
    }
    if (selectedType === 'final') {
      if (score > 40) return { label: 'طالب موهوب', color: 'text-purple-600', bg: 'bg-purple-100' };
      if (score >= 36) return { label: 'طالب متقن', color: 'text-green-600', bg: 'bg-green-100' };
      if (score >= 20) return { label: 'اقترب من تحقيق الهدف', color: 'text-amber-600', bg: 'bg-amber-100' };
      return { label: 'دون الأهداف (يحتاج خطة تطوير)', color: 'text-red-600', bg: 'bg-red-100' };
    }
    return { label: '', color: '', bg: '' };
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-12 print:mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
            <Palette className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight flex items-center">
              {globalConfig?.appTitle || 'بوابة تقييم الفنون البصرية'}
              <InlineEditBtn path={['appTitle']} value={globalConfig?.appTitle || 'بوابة تقييم الفنون البصرية'} />
            </h1>
            <p className="text-gray-500 font-medium text-sm flex items-center mt-1">
              {globalConfig?.appSubtitle || 'مشروع تشغيل المدارس الثقافية الحكومية'}
              <InlineEditBtn path={['appSubtitle']} value={globalConfig?.appSubtitle || 'مشروع تشغيل المدارس الثقافية الحكومية'} />
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
            onClick={handleEditModeToggle}
            className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-colors print:hidden ${isEditMode ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-md shadow-emerald-100' : 'text-gray-600 bg-gray-50 hover:bg-gray-100'}`}
          >
            {isEditMode ? <Save className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {isEditMode ? 'حفظ التعديلات' : 'تفعيل وضع التعديل'}
          </button>
          <button 
            onClick={() => setShowStudentManager(true)}
            className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors print:hidden"
          >
            <Users className="w-4 h-4" />
            إدارة الطلاب
          </button>
          {step !== 'grade' && (
            <button 
              onClick={reset}
              className="text-gray-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-gray-50 print:hidden"
            >
              البدء من جديد
            </button>
          )}
        </div>
      </header>

      {/* Navigation Breadcrumbs / Back button */}
      <div className="mb-8 flex items-center gap-4">
        {step !== 'grade' && (
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            رجوع
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Grade Selection */}
        {step === 'grade' && (
          <motion.div 
            key="step-grade"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {grades.map((grade) => (
              <button
                key={grade.id}
                onClick={() => {
                  setSelectedGrade(grade.id);
                  setStep('subject');
                }}
                className="group p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all text-right flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-gray-50 group-hover:bg-indigo-50 rounded-2xl transition-colors">
                    <GraduationCap className="w-8 h-8 text-gray-400 group-hover:text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center">
                      {grade.name}
                      <InlineEditBtn 
                        path={['grades', globalConfig?.grades?.findIndex((g: any) => g.id === grade.id), 'name']} 
                        value={grade.name} 
                      />
                    </h3>
                    <p className="text-gray-500 text-sm">اختر الصف الدراسي للبدء بالتقييم</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-indigo-600 group-hover:translate-l-2 transition-all rtl:rotate-180" />
              </button>
            ))}
          </motion.div>
        )}

        {/* Step 2: Subject Selection */}
        {step === 'subject' && (
          <motion.div 
            key="step-subject"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="col-span-full mb-4">
              <h2 className="text-lg font-bold text-gray-900">اختر المقرر الدراسي</h2>
            </div>
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => {
                  setSelectedSubject(subject.id);
                  setStep('type');
                }}
                className="group p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-right"
              >
                <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-600 transition-colors flex items-center justify-between w-full">
                  <span className="flex-1">{subject.name}</span>
                  <InlineEditBtn 
                    path={['subjects', globalConfig?.subjects?.findIndex((s: any) => s.id === subject.id), 'name']} 
                    value={subject.name} 
                  />
                </h3>
              </button>
            ))}
          </motion.div>
        )}

        {/* Step 3: Evaluation Type Selection */}
        {step === 'type' && (
          <motion.div 
            key="step-type"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">نوع آلية التقييم</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => { setSelectedType('unit'); setStep('student'); }}
                className="group p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center gap-4 relative"
              >
                <div className="absolute top-2 left-2">
                  <InlineEditBtn path={['evalTypeTitles', 'unit']} value={globalConfig?.evalTypeTitles?.unit || 'تقييم نهاية الوحدة (20 درجة)'} />
                </div>
                <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                  <ClipboardCheck className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-800">{globalConfig?.evalTypeTitles?.unit || 'تقييم نهاية الوحدة (20 درجة)'}</h3>
              </button>
              <button
                onClick={() => { setSelectedType('periodic'); setStep('student'); }}
                className="group p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center gap-4 relative"
              >
                <div className="absolute top-2 left-2">
                  <InlineEditBtn path={['evalTypeTitles', 'periodic']} value={globalConfig?.evalTypeTitles?.periodic || 'التقويم المرحلي (60 درجة)'} />
                </div>
                <div className="p-4 bg-emerald-50 rounded-full group-hover:bg-emerald-100 transition-colors">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-800">{globalConfig?.evalTypeTitles?.periodic || 'التقويم المرحلي (60 درجة)'}</h3>
              </button>
              <button
                onClick={() => { setSelectedType('final'); setStep('student'); }}
                className="group p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center gap-4 relative"
              >
                <div className="absolute top-2 left-2">
                  <InlineEditBtn path={['evalTypeTitles', 'final']} value={globalConfig?.evalTypeTitles?.final || 'التقويم الختامي (50 درجة)'} />
                </div>
                <div className="p-4 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors">
                  <Trophy className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-800">{globalConfig?.evalTypeTitles?.final || 'التقويم الختامي (50 درجة)'}</h3>
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Student Selection */}
        {step === 'student' && (
          <motion.div 
            key="step-student"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">اختر الطالب / الطالبة</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>إجمالي الطلاب: {students.length}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {students.map(student => (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student);
                    setStep('evaluation');
                  }}
                  className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      {student.name[0]}
                    </div>
                    <span className="font-semibold text-gray-800">{student.name}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition-colors rtl:rotate-180" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 5: Evaluation Form */}
        {step === 'evaluation' && (
          <motion.div 
            key="step-evaluation"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8 pb-20 print:pb-0 print:scale-[0.85] print:origin-top print:break-inside-avoid"
          >
            <div className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:border-indigo-200 print:shadow-none">
              <div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-2 inline-block print:border print:border-indigo-100">نموذج تقييم</span>
                <h2 className="text-2xl font-bold text-gray-900">{selectedStudent?.name}</h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 font-medium">
                  <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4" /> {grades.find(g => g.id === selectedGrade)?.name}</span>
                  <span className="flex items-center gap-1"><Palette className="w-4 h-4" /> {subjects.find(s => s.id === selectedSubject)?.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="print:hidden">
                  <div className="text-xs text-gray-400 font-bold mb-1">تاريخ التقييم</div>
                  <input 
                    type="date" 
                    value={evaluationDate}
                    onChange={(e) => setEvaluationDate(e.target.value)}
                    className="bg-gray-50 border border-gray-100 text-sm font-bold text-gray-700 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="hidden print:block text-sm text-gray-500 font-bold mt-2">
                  التاريخ: <span className="text-gray-900 border-b border-gray-300 pb-1 px-2 inline-block min-w-[100px]">{evaluationDate}</span>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-2xl text-center min-w-[140px] print:bg-white print:border print:border-gray-200">
                  <div className="text-xs text-gray-500 font-bold mb-1">الدرجة الإجمالية</div>
                  <div className="text-3xl font-black text-indigo-600">{currentScore} <span className="text-lg text-gray-400 font-medium">/ {totalPossible}</span></div>
                </div>
              </div>
            </div>

            {/* Criteria List */}
            <div className="space-y-6 print:space-y-0 print:border-t print:border-gray-200">
              {currentCriteria.map((criterion, idx) => {
                const max = (criterion as any).max || 4;
                return (
                  <div key={criterion.id} className="bg-white p-6 print:p-1.5 print:px-2 rounded-2xl border border-gray-100 shadow-sm print:border-0 print:border-b print:border-gray-200 print:rounded-none print:shadow-none print:flex print:items-center print:justify-between print:gap-4">
                    <div className="flex items-center gap-4 mb-6 print:mb-0 print:flex-1">
                      <div className="w-8 h-8 print:w-6 print:h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm print:text-xs shrink-0 print:border print:border-indigo-100">
                        {idx + 1}
                      </div>
                      <p className="font-bold text-gray-800 text-lg print:text-xs print:font-medium leading-relaxed print:leading-tight print:m-0 flex items-center flex-1">
                        <span className="flex-1">{criterion.text}</span>
                        <InlineEditBtn 
                          path={getCriteriaPath(idx)} 
                          value={criterion.text} 
                        />
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 print:gap-1 print:shrink-0">
                      {Array.from({ length: max }).map((_, i) => {
                        const val = i + 1;
                        const isSelected = scores[criterion.id] === val;
                        return (
                          <button
                            key={val}
                            onClick={() => setScores(prev => ({ ...prev, [criterion.id]: val }))}
                            className={`flex-1 py-3 px-4 print:py-0.5 print:px-2 rounded-xl print:rounded-md font-bold print:text-xs transition-all border-2 print:border ${
                              isSelected 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 -translate-y-0.5 print:-translate-y-0 print:shadow-none print:bg-indigo-600 print:text-white print:border-indigo-600' 
                                : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-100 hover:text-indigo-600 print:hidden'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                      {/* Placeholder for print when nothing is selected */}
                      {scores[criterion.id] === undefined && (
                        <div className="hidden print:block text-red-500 font-bold text-xs italic print:px-4">
                          لم يتم التقييم
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Category Summary */}
            {(selectedType === 'unit' || selectedType === 'final') && currentScore > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-6 rounded-3xl border-2 flex items-center gap-4 ${getCategory(currentScore, totalPossible).bg} border-current/10`}
              >
                <div className={`p-3 rounded-2xl bg-white shadow-sm ${getCategory(currentScore, totalPossible).color}`}>
                  <Trophy className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-500 mb-1">المستوى التقديري</h4>
                  <p className={`text-xl font-black ${getCategory(currentScore, totalPossible).color}`}>
                    {getCategory(currentScore, totalPossible).label}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Submit Section */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex gap-3 max-w-4xl mx-auto z-10 print:hidden">
              <button 
                onClick={reset}
                className="flex-1 py-4 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all text-sm"
              >
                إلغاء
              </button>
              <button 
                onClick={() => window.print()}
                className="flex-1 py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 transition-all text-sm"
              >
                طباعة / PDF
              </button>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch('/api/evaluations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        student_id: selectedStudent.id,
                        grade_id: selectedGrade,
                        subject_id: selectedSubject,
                        evaluation_type: selectedType,
                        evaluation_date: evaluationDate,
                        scores: scores
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      alert(data.message);
                      reset();
                    } else {
                      alert('حدث خطأ أثناء الحفظ');
                    }
                  } catch (e) {
                    console.error(e);
                    alert('حدث خطأ في الاتصال بالخادم');
                  }
                }}
                className="flex-[2] py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all text-sm"
              >
                اعتماد التقييم
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info Area */}
      {step === 'grade' && (
        <div className="mt-16 bg-white/50 border border-gray-100 rounded-3xl p-8">
          <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-600" />
            حول نظام التقييم
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                يهدف هذا النظام إلى توثيق آليات التقييم والتقويم المستخدمة في تدريس مواد الفنون البصرية، بما يشمل أساسيات الرسم، الفنون البصرية السعودية، الرسم الكرتوني، والأشغال اليدوية.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                رُوعي في تصميم أدوات القياس تنوع الأنشطة وتدرجها، مع التركيز على تتبع تقدم الطالب بشكل مستمر ومنهجي.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-2xl">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">1</div>
                <span className="text-xs font-bold text-indigo-900">تقييم نهاية الوحدة (10 درجات أسبوعياً تقيس الأداء في النشاط المنفذ)</span>
              </div>
              <div className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-2xl">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">2</div>
                <span className="text-xs font-bold text-indigo-900">التقويم المرحلي (بعد مرور 7 أسابيع لرصد أي تأخر مبكر في الأداء)</span>
              </div>
              <div className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-2xl">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">3</div>
                <span className="text-xs font-bold text-indigo-900">التقويم الختامي (تحليل مستوى إتقان المهارات في نهاية الوحدة/الفصل)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStudentManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                إدارة الطلاب
              </h2>
              <button onClick={() => setShowStudentManager(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  placeholder="اسم الطالب الجديد..." 
                  value={newStudentName}
                  onChange={e => setNewStudentName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStudent()}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <button 
                  onClick={addStudent}
                  className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {students.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-indigo-100 transition-colors group">
                    <span className="font-bold text-gray-700 text-sm">{s.name}</span>
                    <button 
                      onClick={() => deleteStudent(s.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف الطالب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {students.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm font-semibold">
                    لا يوجد طلاب مسجلين
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
