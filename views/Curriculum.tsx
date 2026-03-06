import React, { useState, useEffect } from 'react';
import { CurriculumSystem, Language, GradeLevelNode, SubjectNode, ContentResource, LessonPlan, LibraryFolder } from '../types';
import { generateLessonPlan } from '../services/geminiService';
import { useCurriculum } from '../hooks/useCurriculum';
import { useTeachers } from '../hooks/useTeachers';
import { Button } from '../components/Button';
import {
  ArrowLeft,
  Folder,
  BookOpen,
  UploadCloud,
  FileText,
  Video,
  Presentation,
  Trash2,
  Sparkles,
  Globe2,
  Flag,
  Crown,
  Star,
  MoreVertical,
  Plus,
  FolderPlus,
  ChevronRight,
  Pencil,
  X as XIcon,
  Search,
  Check,
  Users,
  Download,
  FileSpreadsheet,
  Upload,
  Info
} from 'lucide-react';

interface CurriculumProps {
  language: Language;
}

export const Curriculum: React.FC<CurriculumProps> = ({ language }) => {
  // ── DB-backed state ──────────────────────────────────────────────────────────
  const curriculum = useCurriculum();
  const { teachers } = useTeachers();

  // ── Local UI state (in-memory only, not persisted) ────────────────────────── 
  const [gradeSubjects, setGradeSubjects] = useState<Record<string, SubjectNode[]>>({});
  const [activeNode, setActiveNode] = useState<{ type: 'grade' | 'subject' | 'week', data: any } | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [selectedSubjectForTeachers, setSelectedSubjectForTeachers] = useState<SubjectNode | null>(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    department: 'General'
  });
  const [uploadType, setUploadType] = useState<'Document' | 'Video' | 'Presentation' | 'Link' | 'SCORM'>('Document');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isRTL = language === Language.AR;

  // Helper: load subjects for a grade and merge directly into tree state
  const ensureGradeSubjects = async (gradeId: string) => {
    if (gradeSubjects[gradeId]) return; // already loaded
    const subs = await curriculum.getSubjects(gradeId);
    setGradeSubjects(prev => ({ ...prev, [gradeId]: subs }));
    // Merge directly into tree so subjects appear without triggering a separate effect
    setTree(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        grades: prev.grades.map(g =>
          g.id === gradeId ? { ...g, subjects: subs } : g
        ),
      };
    });
  };

  // When active grade changes, lazy-load its subjects
  useEffect(() => {
    if (activeNode?.type === 'grade') {
      ensureGradeSubjects(activeNode.data.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNode?.type === 'grade' ? activeNode.data.id : null]);


  // Local tree state — synced from DB hook but augmented with local UI mutations (folders, resources)
  const [tree, setTree] = useState<{
    system: CurriculumSystem;
    academicYear: string;
    grades: GradeLevelNode[];
  } | null>(null);

  // Keep tree in sync when system or grades change (from DB).
  // Subjects are merged separately via gradeSubjects state when lazily loaded.
  useEffect(() => {
    if (curriculum.selectedSystem) {
      setTree(prev => {
        const grades = curriculum.gradeNodes.map(g => ({
          ...g,
          // Preserve any locally loaded subjects (and folder/resource mutations)
          subjects: prev?.grades.find(pg => pg.id === g.id)?.subjects || [],
        })) as GradeLevelNode[];
        return {
          system: curriculum.selectedSystem as CurriculumSystem,
          academicYear: curriculum.academicYear,
          grades,
        };
      });
    } else {
      setTree(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculum.selectedSystem, curriculum.academicYear, curriculum.gradeNodes]);


  // --- Handlers ---
  const handleCreateSystem = async (system: CurriculumSystem) => {
    await curriculum.createSystem(system);
  };

  const handleGenerateAIPlan = async (subject: SubjectNode) => {
    setGeneratingLesson(true);
    try {
      const gradeNode = tree?.grades.find(g => g.subjects.some(s => s.id === subject.id));
      const topic = "Introduction to " + subject.name;
      const plan = await generateLessonPlan(topic, gradeNode?.name || 'General', subject.name, language);
      if (plan) {
        await curriculum.saveLessonPlan(plan, subject.id, gradeNode?.name || '');
        // Refresh this grade's subjects to show the updated lesson plan count
        if (gradeNode) {
          const subs = await curriculum.getSubjects(gradeNode.id);
          setGradeSubjects(prev => ({ ...prev, [gradeNode.id]: subs }));
        }
      }
    } catch (err) {
      console.error('Failed to generate/save lesson plan:', err);
    } finally {
      setGeneratingLesson(false);
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !activeNode || activeNode.type !== 'subject') return;

    const subject = activeNode.data as SubjectNode;
    const newFolder: LibraryFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName,
      resources: [],
      subFolders: []
    };

    const updatedTree = { ...tree! };
    const grade = updatedTree.grades.find(g => g.subjects.some(s => s.id === subject.id));
    if (grade) {
      const sub = grade.subjects.find(s => s.id === subject.id);
      if (sub) {
        if (currentFolderId) {
          // Add to subfolder (recursive search would be better, but for now let's assume one level)
          const parentFolder = sub.folders.find(f => f.id === currentFolderId);
          if (parentFolder) parentFolder.subFolders.push(newFolder);
        } else {
          sub.folders.push(newFolder);
        }
      }
    }

    setTree(updatedTree);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleRenameFolder = (folderId: string) => {
    if (!newFolderName.trim() || !activeNode || activeNode.type !== 'subject') return;

    const updatedTree = { ...tree! };
    const subject = activeNode.data as SubjectNode;
    const grade = updatedTree.grades.find(g => g.subjects.some(s => s.id === subject.id));
    if (grade) {
      const sub = grade.subjects.find(s => s.id === subject.id);
      if (sub) {
        const folder = sub.folders.find(f => f.id === folderId);
        if (folder) folder.name = newFolderName;
      }
    }

    setTree(updatedTree);
    setNewFolderName('');
    setEditingFolderId(null);
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!activeNode || activeNode.type !== 'subject') return;

    const updatedTree = { ...tree! };
    const subject = activeNode.data as SubjectNode;
    const grade = updatedTree.grades.find(g => g.subjects.some(s => s.id === subject.id));
    if (grade) {
      const sub = grade.subjects.find(s => s.id === subject.id);
      if (sub) {
        sub.folders = sub.folders.filter(f => f.id !== folderId);
      }
    }

    setTree(updatedTree);
    if (currentFolderId === folderId) setCurrentFolderId(null);
  };

  const handleDeleteResource = (resourceId: string) => {
    if (!activeNode || activeNode.type !== 'subject') return;

    const updatedTree = { ...tree! };
    const subject = activeNode.data as SubjectNode;
    const grade = updatedTree.grades.find(g => g.subjects.some(s => s.id === subject.id));
    if (grade) {
      const sub = grade.subjects.find(s => s.id === subject.id);
      if (sub) {
        if (currentFolderId) {
          const folder = sub.folders.find(f => f.id === currentFolderId);
          if (folder) folder.resources = folder.resources.filter(r => r.id !== resourceId);
        } else {
          sub.resources = sub.resources.filter(r => r.id !== resourceId);
        }
      }
    }

    setTree(updatedTree);
  };

  const handleFileUpload = (source: 'Local' | 'Google Drive' | 'OneDrive', fileName?: string) => {
    if (!activeNode || activeNode.type !== 'subject') return;

    const type = uploadType === 'Link' ? 'Document' : uploadType;
    const name = fileName || `New ${type} Material`;

    const newResource: ContentResource = {
      id: `res-${Date.now()}`,
      title: name,
      type: type,
      url: '#',
      source: source,
      size: source === 'Local' ? '2.4 MB' : '--',
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    const updatedTree = { ...tree! };
    const subject = activeNode.data as SubjectNode;
    const grade = updatedTree.grades.find(g => g.subjects.some(s => s.id === subject.id));

    if (grade) {
      const sub = grade.subjects.find(s => s.id === subject.id);
      if (sub) {
        if (currentFolderId) {
          const folder = sub.folders.find(f => f.id === currentFolderId);
          if (folder) folder.resources.push(newResource);
        } else {
          sub.resources.push(newResource);
        }
      }
    }

    setTree(updatedTree);
    setIsUploadModalOpen(false);
  };

  const handleAddSubject = async () => {
    if (!newSubject.code || !newSubject.nameEn || !newSubject.nameAr || !activeNode || activeNode.type !== 'grade') return;

    const grade = activeNode.data as GradeLevelNode;
    try {
      await curriculum.addSubject({
        code: newSubject.code,
        nameEn: newSubject.nameEn,
        nameAr: newSubject.nameAr,
        department: newSubject.department,
        gradeLevelId: grade.id,
        gradeLevel: grade.name,
      });
      // Refresh subjects for this grade
      const subs = await curriculum.getSubjects(grade.id);
      setGradeSubjects(prev => ({ ...prev, [grade.id]: subs }));
    } catch (err) {
      console.error('Failed to add subject:', err);
    }
    setIsAddSubjectModalOpen(false);
    setNewSubject({ code: '', nameEn: '', nameAr: '', department: 'General' });
  };

  const handleExportSubjects = () => {
    if (!activeNode || activeNode.type !== 'grade' || !tree) return;
    const grade = activeNode.data as GradeLevelNode;
    const subjects = grade.subjects;

    const headers = ['Code', 'NameEn', 'NameAr', 'Department'];
    const rows = subjects.map(s => [
      s.code || '',
      s.nameEn || '',
      s.nameAr || '',
      s.department || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `subjects_${grade.name.replace(/\s+/g, '_').toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSubjectTemplate = () => {
    const headers = ['Code', 'NameEn', 'NameAr', 'Department'];
    const example = ['MATH101', 'Mathematics', 'الرياضيات', 'Mathematics'];
    const csvContent = [headers.join(','), example.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'subject_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSubjects = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeNode || activeNode.type !== 'grade' || !tree) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const grade = activeNode.data as GradeLevelNode;
      const newSubjects: SubjectNode[] = [];

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [code, nameEn, nameAr, department] = line.split(',').map(s => s.replace(/^"|"$/g, '').trim());

        if (code && nameEn && nameAr) {
          newSubjects.push({
            id: `s-${grade.id}-${Date.now()}-${i}`,
            name: isRTL ? nameAr : nameEn,
            code,
            nameEn,
            nameAr,
            department: department || 'General',
            weeks: [],
            resources: [],
            folders: [],
            lessonPlans: [],
            assignedTeacherIds: []
          });
        }
      }

      if (newSubjects.length > 0) {
        const updatedTree = { ...tree };
        const targetGrade = updatedTree.grades.find(g => g.id === grade.id);
        if (targetGrade) {
          targetGrade.subjects = [...targetGrade.subjects, ...newSubjects];
        }
        setTree(updatedTree);
      }
      setIsImportModalOpen(false);
    };
    reader.readAsText(file);
  };

  const handleToggleTeacher = async (teacherId: string) => {
    if (!selectedSubjectForTeachers || !tree) return;

    const gradeNode = tree.grades.find(g => g.subjects.some(s => s.id === selectedSubjectForTeachers.id));
    const currentIds = selectedSubjectForTeachers.assignedTeacherIds || [];
    const isAssigned = currentIds.includes(teacherId);

    try {
      await curriculum.toggleTeacher(
        selectedSubjectForTeachers.id,
        teacherId,
        gradeNode?.id || '',
        isAssigned
      );
      // Update local state for the modal
      const newIds = isAssigned
        ? currentIds.filter(id => id !== teacherId)
        : [...currentIds, teacherId];
      const updated = { ...selectedSubjectForTeachers, assignedTeacherIds: newIds };
      setSelectedSubjectForTeachers(updated);

      // Refresh grade subjects
      if (gradeNode) {
        const subs = await curriculum.getSubjects(gradeNode.id);
        setGradeSubjects(prev => ({ ...prev, [gradeNode.id]: subs }));
      }
    } catch (err) {
      console.error('Failed to toggle teacher:', err);
    }
  };

  const onLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload('Local', file.name);
    }
  };

  const goBack = () => {
    if (currentFolderId) {
      setCurrentFolderId(null);
      return;
    }
    if (activeNode?.type === 'subject') {
      // Find parent grade to return to
      if (tree) {
        const parentGrade = tree.grades.find(g => g.subjects.find(s => s.id === activeNode.data.id));
        if (parentGrade) {
          setActiveNode({ type: 'grade', data: parentGrade });
          return;
        }
      }
    }
    setActiveNode(null);
  };

  // --- Icon Helpers ---
  const getSystemIcon = (sys: string) => {
    switch (sys) {
      case 'National': return <Flag size={32} />;
      case 'IG': return <Crown size={32} />;
      case 'IB': return <Globe2 size={32} />;
      case 'American': return <Star size={32} />;
      default: return <Globe2 size={32} />;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'Document': return <FileText size={16} className="text-white" />;
      case 'Presentation': return <Presentation size={16} className="text-white" />;
      case 'Video': return <Video size={16} className="text-white" />;
      case 'SCORM': return <Globe2 size={16} className="text-white" />;
      default: return <FileText size={16} className="text-white" />;
    }
  };

  // --- Components ---
  const SetupView = () => (
    <div className="max-w-5xl mx-auto py-12 animate-fadeIn text-center">
      <div className="mb-12">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Curriculum Setup</h2>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">Select an educational framework to automatically generate grade levels, subjects, and academic calendars.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {(['National', 'IG', 'IB', 'American'] as CurriculumSystem[]).map(sys => (
          <div
            key={sys}
            onClick={() => handleCreateSystem(sys)}
            className="group bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden flex flex-col items-center"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:bg-orange-100 transition-colors">
              {getSystemIcon(sys)}
            </div>
            <h3 className="font-bold text-xl text-gray-900">{sys}</h3>
            <p className="text-sm text-gray-400 mt-2">Standardized Structure</p>
          </div>
        ))}
      </div>
      <Button variant="secondary" className="mx-auto" onClick={() => setIsImporting(true)} isLoading={isImporting}>
        <UploadCloud size={18} />
        Import from CSV
      </Button>
    </div>
  );

  const TreeView = () => {
    if (!tree) return null;

    // Mobile Navigation States
    const isMobile = true; // In a real app, use a hook. For now, we rely on responsive CSS classes.
    // However, for logical rendering, let's treat "no active node" as Home, and "active node" as drill down.

    return (
      <>
        <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-140px)] animate-fadeIn gap-6 relative">

          {/* Mobile Header / Back Button */}
          {activeNode && (
            <div className="lg:hidden flex items-center gap-2 mb-2">
              <button onClick={goBack} className="p-2 bg-white rounded-full shadow-sm border border-gray-100">
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <span className="font-bold text-gray-900">
                {activeNode.type === 'grade' ? (activeNode.data as GradeLevelNode).name : (activeNode.data as SubjectNode).name}
              </span>
            </div>
          )}

          {/* Sidebar / Mobile Home View */}
          <div className={`
          w-full lg:w-80 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col
          ${activeNode ? 'hidden lg:flex' : 'flex'}
        `}>
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">{tree.system}</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">{tree.academicYear}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {tree.grades.map(grade => (
                <div key={grade.id} className="mb-2">
                  <div
                    onClick={() => setActiveNode({ type: 'grade', data: grade })}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors group ${activeNode?.data.id === grade.id ? 'bg-primary-50 text-primary-800' : 'hover:bg-gray-50'}`}
                  >
                    <Folder size={20} className={`${activeNode?.data.id === grade.id ? 'text-primary-600 fill-primary-200' : 'text-gray-400 fill-gray-50 group-hover:text-primary-400 group-hover:fill-primary-100'}`} />
                    <span className={`text-sm font-medium ${activeNode?.data.id === grade.id ? 'font-bold' : 'text-gray-700'}`}>{grade.name}</span>
                  </div>

                  {/* Desktop: Nested Subjects */}
                  <div className="hidden lg:block">
                    {(activeNode?.data.id === grade.id || activeNode?.data.id?.startsWith(grade.id)) && (
                      <div className="pl-9 space-y-1 mt-1 mb-2 border-l-2 border-gray-100 ml-5">
                        {grade.subjects.map(subject => (
                          <div
                            key={subject.id}
                            onClick={(e) => { e.stopPropagation(); setActiveNode({ type: 'subject', data: subject }); }}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${activeNode?.data.id === subject.id ? 'bg-orange-100 text-orange-900 font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
                          >
                            <BookOpen size={16} />
                            <span className="text-sm">{subject.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className={`
          flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col
          ${activeNode ? 'flex' : 'hidden lg:flex'}
        `}>
            {!activeNode ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <Folder size={48} className="text-gray-300" />
                </div>
                <p className="text-xl font-medium text-gray-900">No Selection</p>
                <p className="text-sm">Select a grade from the sidebar to manage subjects and content.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 lg:p-8">

                {/* GRADE DETAIL VIEW (Mobile & Desktop) */}
                {activeNode.type === 'grade' && (
                  <div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                      <div>
                        <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900">{(activeNode.data as GradeLevelNode).name}</h2>
                        <p className="text-sm text-gray-500 mt-1">{(activeNode.data as GradeLevelNode).subjects.length} Subjects Total</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="secondary" className="px-4 py-2 text-xs" onClick={() => setIsImportModalOpen(true)}>
                          <Upload size={16} /> {isRTL ? 'استيراد' : 'Import'}
                        </Button>
                        <Button variant="secondary" className="px-4 py-2 text-xs" onClick={handleExportSubjects}>
                          <Download size={16} /> {isRTL ? 'تصدير' : 'Export'}
                        </Button>
                        <Button variant="tonal" className="px-4 py-2 text-xs" onClick={() => setIsAddSubjectModalOpen(true)}>
                          <Plus size={16} /> {isRTL ? 'إضافة مادة' : 'Add Subject'}
                        </Button>
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="relative max-w-md">
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-3 text-gray-400`} size={18} />
                        <input
                          type="text"
                          placeholder={isRTL ? 'البحث في المواد...' : 'Search subjects...'}
                          className={`w-full p-3 ${isRTL ? 'pr-12' : 'pl-12'} bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all`}
                          value={subjectSearchQuery}
                          onChange={(e) => setSubjectSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                      {(activeNode.data as GradeLevelNode).subjects
                        .filter(sub =>
                          sub.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
                          sub.code?.toLowerCase().includes(subjectSearchQuery.toLowerCase()) ||
                          sub.department?.toLowerCase().includes(subjectSearchQuery.toLowerCase())
                        )
                        .map((sub: SubjectNode) => (
                          <div
                            key={sub.id}
                            onClick={() => setActiveNode({ type: 'subject', data: sub })}
                            className="group bg-gray-50 hover:bg-white p-5 lg:p-6 rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-lg transition-all cursor-pointer relative"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-orange-500 group-hover:bg-orange-50 transition-colors">
                                <BookOpen size={24} />
                              </div>
                              <span className="bg-white text-gray-500 text-[10px] font-bold px-2 py-1 rounded border border-gray-100 uppercase">{sub.weeks.length} Weeks</span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{sub.name}</h3>
                            <p className="text-sm text-gray-500 mb-4 flex items-center gap-2">
                              <FileText size={14} /> {sub.resources.length} Resources
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                className="flex-1 text-xs py-1.5 h-8 bg-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubjectForTeachers(sub);
                                  setIsTeacherModalOpen(true);
                                }}
                              >
                                Teachers {sub.assignedTeacherIds && sub.assignedTeacherIds.length > 0 && `(${sub.assignedTeacherIds.length})`}
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* SUBJECT DETAIL VIEW */}
                {activeNode.type === 'subject' && (
                  <div className="space-y-8">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 pb-6 border-b border-gray-100">
                      <div>
                        <p className="text-sm text-orange-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                          <BookOpen size={14} /> Subject Management
                        </p>
                        <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900">{(activeNode.data as SubjectNode).name}</h2>
                      </div>
                      <Button onClick={() => handleGenerateAIPlan(activeNode.data)} isLoading={generatingLesson} className="shadow-orange-200 w-full lg:w-auto">
                        <Sparkles size={18} /> AI Lesson Plan
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                      {/* Left Column: Content Library */}
                      <div className="xl:col-span-2 space-y-6">

                        {/* Drop Zone */}
                        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50/50 hover:bg-orange-50/30 hover:border-orange-200 transition-colors group">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                            <UploadCloud size={32} />
                          </div>
                          <h3 className="font-bold text-gray-900 mb-1">Upload Materials</h3>
                          <p className="text-sm text-gray-500 mb-6">Drag & drop files or import</p>
                          <div className="flex flex-wrap justify-center gap-3">
                            {['Document', 'Video', 'Presentation', 'SCORM'].map((type) => (
                              <button
                                key={type}
                                onClick={() => {
                                  setUploadType(type as any);
                                  setIsUploadModalOpen(true);
                                }}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                              >
                                + {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Upload Modal */}
                        {isUploadModalOpen && (
                          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-xl font-bold text-gray-900">Upload {uploadType}</h3>
                                <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                  <XIcon size={20} />
                                </button>
                              </div>
                              <div className="p-8 space-y-6">
                                <div className="grid grid-cols-1 gap-4">
                                  <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:bg-orange-50 hover:border-orange-200 transition-all group"
                                  >
                                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <UploadCloud size={24} />
                                    </div>
                                    <div className="text-left">
                                      <p className="font-bold text-gray-900">Local Device</p>
                                      <p className="text-xs text-gray-500">Upload from your computer</p>
                                    </div>
                                  </button>

                                  <button
                                    onClick={() => handleFileUpload('Google Drive')}
                                    className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all group"
                                  >
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M7.71 3.5L1.15 15l3.43 6 6.55-11.5H1.15L7.71 3.5zm1.05 8.5l3.44 6 3.44-6h-6.88zm14.09 3L16.29 3.5l-6.55 11.5h13.11z" />
                                      </svg>
                                    </div>
                                    <div className="text-left">
                                      <p className="font-bold text-gray-900">Google Drive</p>
                                      <p className="text-xs text-gray-500">Import from your Drive</p>
                                    </div>
                                  </button>

                                  <button
                                    onClick={() => handleFileUpload('OneDrive')}
                                    className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
                                  >
                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M16.5 13.5c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5zm-10-4c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5zm10-6c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5z" />
                                      </svg>
                                    </div>
                                    <div className="text-left">
                                      <p className="font-bold text-gray-900">OneDrive</p>
                                      <p className="text-xs text-gray-500">Import from Microsoft 365</p>
                                    </div>
                                  </button>
                                </div>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  className="hidden"
                                  onChange={onLocalFileChange}
                                  accept={uploadType === 'Document' ? '.pdf,.doc,.docx,.txt' : uploadType === 'Video' ? 'video/*' : uploadType === 'Presentation' ? '.ppt,.pptx' : uploadType === 'SCORM' ? '.zip' : '*'}
                                />
                              </div>
                              <div className="p-6 bg-gray-50 border-t border-gray-100">
                                <Button variant="secondary" className="w-full" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Resource List */}
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                              Library <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                {currentFolderId
                                  ? (activeNode.data as SubjectNode).folders.find(f => f.id === currentFolderId)?.resources.length || 0
                                  : (activeNode.data as SubjectNode).resources.length + (activeNode.data as SubjectNode).folders.length
                                }
                              </span>
                            </h3>
                            <div className="flex gap-2">
                              {currentFolderId && (
                                <button
                                  onClick={() => setCurrentFolderId(null)}
                                  className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
                                >
                                  <ArrowLeft size={14} /> Back
                                </button>
                              )}
                              <button
                                onClick={() => setIsCreatingFolder(true)}
                                className="text-xs font-bold text-orange-600 hover:bg-orange-50 px-2 py-1 rounded flex items-center gap-1"
                              >
                                <FolderPlus size={14} /> New Folder
                              </button>
                            </div>
                          </div>

                          {isCreatingFolder && (
                            <div className="mb-4 p-4 bg-orange-50 rounded-2xl border border-orange-100 flex gap-2 animate-fadeIn">
                              <input
                                autoFocus
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Folder name..."
                                className="flex-1 bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                              />
                              <Button onClick={handleCreateFolder} className="py-2 px-4 text-xs">Create</Button>
                              <button onClick={() => setIsCreatingFolder(false)} className="text-gray-400 hover:text-gray-600 px-2">Cancel</button>
                            </div>
                          )}

                          <div className="space-y-3">
                            {/* Render Folders if at root */}
                            {!currentFolderId && (activeNode.data as SubjectNode).folders.map((folder) => (
                              <div
                                key={folder.id}
                                className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all group"
                              >
                                <div
                                  onClick={() => setCurrentFolderId(folder.id)}
                                  className="flex items-center gap-4 flex-1 cursor-pointer"
                                >
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600">
                                    <Folder size={20} fill="currentColor" fillOpacity={0.2} />
                                  </div>
                                  {editingFolderId === folder.id ? (
                                    <div className="flex gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        autoFocus
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        className="flex-1 bg-white border border-orange-200 rounded-lg px-2 py-1 text-sm focus:outline-none"
                                        onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder(folder.id)}
                                      />
                                      <button onClick={() => handleRenameFolder(folder.id)} className="text-xs font-bold text-orange-600">Save</button>
                                      <button onClick={() => setEditingFolderId(null)} className="text-xs text-gray-400">Cancel</button>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="font-bold text-gray-900 text-sm">{folder.name}</p>
                                      <p className="text-xs text-gray-400">{folder.resources.length} items • {folder.subFolders.length} folders</p>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {editingFolderId !== folder.id && (
                                    <>
                                      <button
                                        onClick={() => { setEditingFolderId(folder.id); setNewFolderName(folder.name); }}
                                        className="p-2 text-gray-300 hover:text-orange-500 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                                      >
                                        <Pencil size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFolder(folder.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                      <ChevronRight size={18} className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Render Resources */}
                            {(currentFolderId
                              ? (activeNode.data as SubjectNode).folders.find(f => f.id === currentFolderId)?.resources || []
                              : (activeNode.data as SubjectNode).resources
                            ).map((file, i) => (
                              <div key={file.id || i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all group">
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs ${file.type === 'Document' ? 'bg-red-500' : file.type === 'Presentation' ? 'bg-orange-500' : file.type === 'SCORM' ? 'bg-teal-500' : 'bg-blue-500'}`}>
                                    {getFileIcon(file.type)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 text-sm">{file.title}</p>
                                    <p className="text-xs text-gray-400">{file.size || '2.4 MB'} • {file.uploadedAt || 'Uploaded yesterday'}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteResource(file.id)}
                                  className="text-gray-300 hover:text-red-500 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* AI Plans List */}
                        {(activeNode.data as SubjectNode).lessonPlans.length > 0 && (
                          <div>
                            <h3 className="font-bold text-gray-900 mb-4 mt-8">Generated Lesson Plans</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(activeNode.data as SubjectNode).lessonPlans.map((plan, i) => (
                                <div key={i} className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="bg-white/60 text-teal-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                                      <Sparkles size={10} /> AI GENERATED
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-gray-900 mb-1">{plan.topic}</h4>
                                  <p className="text-xs text-gray-500 mb-3">{plan.objectives.length} Objectives</p>
                                  <button className="text-xs font-bold text-teal-700 hover:underline">View Details →</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Timeline */}
                      <div className="bg-gray-50 rounded-3xl p-6 h-fit border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-6">Academic Schedule</h3>
                        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pl-6 pb-2">
                          {(activeNode.data as SubjectNode).weeks.slice(0, 5).map((week) => (
                            <div key={week.id} className="relative">
                              <span className="absolute -left-[31px] w-4 h-4 rounded-full bg-white border-2 border-orange-500"></span>
                              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <span className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1 block">Week {week.weekNumber}</span>
                                <p className="text-xs text-gray-400">{week.startDate} - {week.endDate}</p>
                                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                  <span className="text-xs text-gray-400 italic">No topics assigned</span>
                                  <button className="text-xs font-bold text-primary-600 hover:bg-primary-50 p-1 rounded">
                                    <Plus size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="relative">
                            <span className="absolute -left-[31px] w-4 h-4 rounded-full bg-gray-200"></span>
                            <p className="text-xs text-gray-400 italic pt-1">... 35 more weeks</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Add Subject Modal */}
        {isAddSubjectModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{isRTL ? 'إضافة مادة جديدة' : 'Add New Subject'}</h3>
                    <p className="text-sm text-gray-500">{isRTL ? 'أدخل تفاصيل المادة الدراسية الجديدة' : 'Enter the details for the new academic subject'}</p>
                  </div>
                </div>
                <button onClick={() => setIsAddSubjectModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                  <XIcon size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isRTL ? 'رمز المادة' : 'Subject Code'}</label>
                  <input
                    type="text"
                    value={newSubject.code}
                    onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                    placeholder="e.g. MATH101"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isRTL ? 'الاسم بالإنجليزية' : 'Name (EN)'}</label>
                    <input
                      type="text"
                      value={newSubject.nameEn}
                      onChange={(e) => setNewSubject({ ...newSubject, nameEn: e.target.value })}
                      placeholder="e.g. Mathematics"
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isRTL ? 'الاسم بالعربية' : 'Name (AR)'}</label>
                    <input
                      type="text"
                      value={newSubject.nameAr}
                      onChange={(e) => setNewSubject({ ...newSubject, nameAr: e.target.value })}
                      placeholder="مثال: الرياضيات"
                      className={`w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all ${isRTL ? 'text-right' : ''}`}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{isRTL ? 'القسم' : 'Department'}</label>
                  <select
                    value={newSubject.department}
                    onChange={(e) => setNewSubject({ ...newSubject, department: e.target.value })}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none"
                  >
                    <option value="Science">Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Languages">Languages</option>
                    <option value="Social Studies">Social Studies</option>
                    <option value="Arts">Arts</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-3">
                <Button variant="secondary" className="flex-1 h-12 rounded-2xl" onClick={() => setIsAddSubjectModalOpen(false)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary-100" onClick={handleAddSubject}>
                  {isRTL ? 'إضافة المادة' : 'Add Subject'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Teacher Selection Modal */}
        {isTeacherModalOpen && selectedSubjectForTeachers && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[80vh]">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{isRTL ? 'تعيين المعلمين' : 'Assign Teachers'}</h3>
                    <p className="text-sm text-gray-500">{selectedSubjectForTeachers.name}</p>
                  </div>
                </div>
                <button onClick={() => setIsTeacherModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                  <XIcon size={20} />
                </button>
              </div>

              <div className="p-6 border-b border-gray-100">
                <div className="relative">
                  <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-3 text-gray-400`} size={18} />
                  <input
                    type="text"
                    placeholder={isRTL ? 'البحث عن معلم...' : 'Search teachers...'}
                    className={`w-full p-3 ${isRTL ? 'pr-12' : 'pl-12'} bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all`}
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {teachers.filter(t =>
                  t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
                  (t.specialization || '').toLowerCase().includes(teacherSearchQuery.toLowerCase())
                ).map(teacher => {
                  const isSelected = selectedSubjectForTeachers.assignedTeacherIds?.includes(teacher.id);
                  return (

                    <div
                      key={teacher.id}
                      onClick={() => handleToggleTeacher(teacher.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${isSelected
                        ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200'
                        : 'bg-white border-gray-100 hover:bg-gray-50'
                        }`}
                    >
                      <img
                        src={teacher.avatar}
                        alt={teacher.name}
                        className="w-12 h-12 rounded-xl object-cover shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{teacher.name}</p>
                        <p className="text-xs text-gray-500">{teacher.specialization}</p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center">
                          <Check size={14} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-3">
                <Button className="w-full h-12 rounded-2xl shadow-lg shadow-primary-100" onClick={() => setIsTeacherModalOpen(false)}>
                  {isRTL ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{isRTL ? 'استيراد المواد' : 'Import Subjects'}</h3>
                    <p className="text-sm text-gray-500">{isRTL ? 'ارفع ملف CSV لإضافة عدة مواد' : 'Upload a CSV file to add multiple subjects'}</p>
                  </div>
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                  <XIcon size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex-shrink-0 flex items-center justify-center">
                    <Info size={20} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bold text-blue-900 text-sm">{isRTL ? 'التعليمات' : 'Instructions'}</h4>
                    <p className="text-xs text-blue-700">
                      {isRTL ? 'يجب أن يحتوي الملف على الأعمدة التالية:' : 'File must contain the following columns:'}
                      <br />
                      <strong>Code, NameEn, NameAr, Department</strong>
                    </p>
                    <button
                      onClick={downloadSubjectTemplate}
                      type="button"
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Download size={12} /> {isRTL ? 'تحميل النموذج' : 'Download Template'}
                    </button>
                  </div>
                </div>

                <div className="border-2 border-dashed rounded-[2rem] p-12 text-center transition-all border-gray-200 bg-gray-50/30 hover:border-primary-300 hover:bg-gray-50">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6 text-primary-600">
                    <Upload size={32} />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">{isRTL ? 'ارفع ملف CSV' : 'Upload your CSV file'}</h4>
                  <p className="text-sm text-gray-500 mb-8">{isRTL ? 'اسحب الملف هنا أو اضغط للاختيار' : 'Drag and drop your file here, or click to browse'}</p>
                  <input type="file" className="hidden" id="subject-csv-import" accept=".csv" onChange={handleImportSubjects} />
                  <label htmlFor="subject-csv-import">
                    <div className="inline-flex items-center justify-center px-8 py-3 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 cursor-pointer">
                      {isRTL ? 'اختيار ملف' : 'Select File'}
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100">
                <Button variant="secondary" className="w-full h-12 rounded-2xl" onClick={() => setIsImportModalOpen(false)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return tree ? <TreeView /> : <SetupView />;
};