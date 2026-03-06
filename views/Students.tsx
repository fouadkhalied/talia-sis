import React, { useState } from 'react';
import { MOCK_TEACHERS, MOCK_ADMINS, CLASSES } from '../services/mockData';
import { Language, Student, Teacher, Admin, UserRole } from '../types';
import { StudentProfile } from './StudentProfile';
import { Button } from '../components/Button';
import { useStudents } from '../hooks/useStudents';
import {
   Search,
   Plus,
   Filter,
   ChevronRight,
   User,
   GraduationCap,
   Briefcase,
   ShieldCheck,
   Upload,
   FileSpreadsheet,
   MoreVertical,
   Calendar,
   Mail,
   Phone,
   Lock,
   Download,
   Settings,
   X,
   ToggleLeft,
   ToggleRight,
   Users,
   LayoutTemplate
} from 'lucide-react';

interface UserManagementProps {
   language: Language;
   role: UserRole;
}

// Mock Permission Data
const PERMISSION_GROUPS = [
   {
      category: 'User Management',
      perms: [
         { id: 'users_create', label: 'Create/Edit Users' },
         { id: 'users_delete', label: 'Delete Users' },
         { id: 'users_reset', label: 'Reset Passwords' }
      ]
   },
   {
      category: 'Academic Affairs',
      perms: [
         { id: 'aca_curriculum', label: 'Manage Curriculum' },
         { id: 'aca_schedule', label: 'Manage Schedule' },
         { id: 'aca_grades', label: 'Approve Grades' }
      ]
   },
   {
      category: 'Finance',
      perms: [
         { id: 'fin_view', label: 'View Financials' },
         { id: 'fin_manage', label: 'Manage Fees' }
      ]
   },
   {
      category: 'System',
      perms: [
         { id: 'sys_settings', label: 'Global Settings' },
         { id: 'sys_logs', label: 'View Audit Logs' }
      ]
   }
];

const ADMIN_TEMPLATES: Record<string, string[]> = {
   'Super Admin': ['users_create', 'users_delete', 'users_reset', 'aca_curriculum', 'aca_schedule', 'aca_grades', 'fin_view', 'fin_manage', 'sys_settings', 'sys_logs'],
   'Academic Manager': ['aca_curriculum', 'aca_schedule', 'aca_grades', 'users_create'],
   'Registrar': ['users_create', 'users_reset', 'aca_schedule'],
   'Finance Officer': ['fin_view', 'fin_manage'],
   'IT Support': ['sys_settings', 'sys_logs', 'users_reset']
};

export const UserManagement: React.FC<UserManagementProps> = ({ language, role }) => {
   const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'admins'>('students');
   const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

   // Data State
   const { students: dbStudents, loading, refresh, addStudent } = useStudents();
   const [teachersList, setTeachersList] = useState<Teacher[]>(MOCK_TEACHERS);
   const [adminsList, setAdminsList] = useState<Admin[]>(MOCK_ADMINS);

   const studentsList = dbStudents;

   // Modal States
   const [uploadModalType, setUploadModalType] = useState<'student' | 'teacher' | null>(null);
   const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
   const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
   const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);

   // --- Form States ---

   // Student Form
   const [newStudent, setNewStudent] = useState({
      name: '', grade: 'Grade 10', dob: '', parentName: '', parentPhone: '', parentEmail: ''
   });

   // Teacher Form
   const [newTeacher, setNewTeacher] = useState({
      name: '',
      email: '',
      hiringDate: new Date().toISOString().split('T')[0],
      type: 'Full-time',
      subject: 'Mathematics'
   });

   // Admin Form
   const [newAdmin, setNewAdmin] = useState({
      name: '', email: '', title: '', department: 'Administration'
   });
   const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
   const [selectedAdminTemplate, setSelectedAdminTemplate] = useState('Custom');

   const handleTemplateChange = (template: string) => {
      setSelectedAdminTemplate(template);
      if (template !== 'Custom' && ADMIN_TEMPLATES[template]) {
         setAdminPermissions(ADMIN_TEMPLATES[template]);
         // Auto-set title if empty
         if (!newAdmin.title) setNewAdmin(prev => ({ ...prev, title: template }));
      }
   };

   const togglePermission = (id: string) => {
      if (adminPermissions.includes(id)) {
         setAdminPermissions(prev => prev.filter(p => p !== id));
         setSelectedAdminTemplate('Custom');
      } else {
         setAdminPermissions(prev => [...prev, id]);
         setSelectedAdminTemplate('Custom');
      }
   };

   const handleCreateStudent = async () => {
      try {
         await addStudent({
            name: newStudent.name || 'New Student',
            gradeLevel: newStudent.grade,
            dob: newStudent.dob,
            status: 'Active'
         });
         setIsAddStudentOpen(false);
         setNewStudent({ name: '', grade: 'Grade 10', dob: '', parentName: '', parentPhone: '', parentEmail: '' });
      } catch (error) {
         console.error('Failed to create student:', error);
         alert('Failed to create student. Please check the console for details.');
      }
   };

   const handleCreateTeacher = () => {
      const teacher: Teacher = {
         id: `t-${Date.now()}`,
         name: newTeacher.name || 'New Teacher',
         role: UserRole.TEACHER,
         avatar: `https://ui-avatars.com/api/?name=${newTeacher.name}&background=random`,
         email: newTeacher.email,
         specialization: newTeacher.subject,
         hiringDate: newTeacher.hiringDate,
         employmentType: newTeacher.type as any,
         phone: '',
         assignedClasses: [],
         academicLoad: 0
      };
      setTeachersList([teacher, ...teachersList]);
      setIsAddTeacherOpen(false);
      setNewTeacher({ name: '', email: '', hiringDate: new Date().toISOString().split('T')[0], type: 'Full-time', subject: 'Mathematics' });
   };

   const handleCreateAdmin = () => {
      const admin: Admin = {
         id: `adm-${Date.now()}`,
         name: newAdmin.name || 'New Admin',
         role: UserRole.ADMIN,
         avatar: `https://ui-avatars.com/api/?name=${newAdmin.name}&background=random`,
         email: newAdmin.email,
         title: newAdmin.title,
         department: newAdmin.department,
         permissions: adminPermissions,
         lastActive: 'Just now'
      };
      setAdminsList([admin, ...adminsList]);
      setIsAddAdminOpen(false);
      setNewAdmin({ name: '', email: '', title: '', department: 'Administration' });
      setAdminPermissions([]);
      setSelectedAdminTemplate('Custom');
   };

   // --- SUB-COMPONENTS ---

   // 1. Student List
   const StudentListView = () => (
      <div className="space-y-6 animate-fadeIn">
         <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input
                  type="text"
                  placeholder="Search students..."
                  className="w-full border border-gray-200 bg-gray-50 rounded-full pl-11 pr-5 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
               />
            </div>
            <div className="flex gap-2">
               <Button variant="secondary" onClick={() => setUploadModalType('student')}>
                  <Upload size={18} /> Import CSV
               </Button>
               <Button variant="primary" onClick={() => setIsAddStudentOpen(true)}>
                  <Plus size={18} /> Add Student
               </Button>
            </div>
         </div>

         <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 text-gray-500 font-semibold border-b border-gray-100">
                     <tr>
                        <th className="px-8 py-5">Name</th>
                        <th className="px-6 py-5">ID Number</th>
                        <th className="px-6 py-5">Grade Level</th>
                        <th className="px-6 py-5">Attendance</th>
                        <th className="px-6 py-5">Status</th>
                        <th className="px-6 py-5">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {loading ? (
                        <tr>
                           <td colSpan={6} className="px-8 py-20 text-center">
                              <div className="flex flex-col items-center gap-3 text-center">
                                 <div className="w-8 h-8 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
                                 <p className="text-gray-500 font-medium tracking-wide">Fetching school records...</p>
                              </div>
                           </td>
                        </tr>
                     ) : studentsList.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="px-8 py-20 text-center">
                              <div className="flex flex-col items-center gap-4">
                                 <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mx-auto">
                                    <Users size={32} />
                                 </div>
                                 <div className="max-w-xs mx-auto">
                                    <p className="font-bold text-gray-900 text-lg">No students enrolled yet</p>
                                    <p className="text-gray-500 text-sm mt-1">Ready to start the academic year? Add your first student to see them here.</p>
                                 </div>
                                 <Button variant="primary" onClick={() => setIsAddStudentOpen(true)} className="mt-2">
                                    <Plus size={18} /> Enroll First Student
                                 </Button>
                              </div>
                           </td>
                        </tr>
                     ) : (
                        studentsList.map((student) => (
                           <tr key={student.id} className="hover:bg-primary-50/30 transition-colors group cursor-pointer" onClick={() => setSelectedStudent(student)}>
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden">
                                       <User size={20} />
                                    </div>
                                    <div>
                                       <p className="font-bold text-gray-900">{student.name}</p>
                                       <p className="text-xs text-gray-400">Class A</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-5 text-gray-500 font-mono text-xs">{student.id}</td>
                              <td className="px-6 py-5">
                                 <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">
                                    {student.grade}
                                 </span>
                              </td>
                              <td className="px-6 py-5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                                       <div
                                          className={`h-1.5 rounded-full ${student.attendance > 90 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                          style={{ width: `${student.attendance}%` }}
                                       ></div>
                                    </div>
                                    <span className="font-bold text-gray-700">{student.attendance}%</span>
                                 </div>
                              </td>
                              <td className="px-6 py-5">
                                 <span className={`px-3 py-1 rounded-full text-xs font-bold border ${student.status === 'Active'
                                       ? 'bg-green-50 text-green-700 border-green-100'
                                       : student.status === 'At Risk'
                                          ? 'bg-red-50 text-red-700 border-red-100'
                                          : 'bg-gray-50 text-gray-600 border-gray-100'
                                    }`}>
                                    {student.status}
                                 </span>
                              </td>
                              <td className="px-6 py-5 text-right">
                                 <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                                    <ChevronRight size={18} />
                                 </button>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );

   // 2. Teacher Management View
   const TeacherListView = () => (
      <div className="space-y-6 animate-fadeIn">
         <div className="flex justify-between items-center">
            <div className="flex gap-2">
               <Button variant="secondary" className="rounded-full"><Filter size={16} /> Filter</Button>
               <input type="text" placeholder="Search faculty..." className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64" />
            </div>
            <div className="flex gap-2">
               <Button variant="secondary" onClick={() => setUploadModalType('teacher')} className="shadow-sm">
                  <Upload size={18} /> Bulk Import
               </Button>
               <Button variant="primary" onClick={() => setIsAddTeacherOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-blue-200">
                  <Plus size={18} /> Add Teacher
               </Button>
            </div>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {teachersList.map(teacher => {
               const assignedClassDetails = CLASSES.filter(c => teacher.assignedClasses.includes(c.id));

               return (
                  <div key={teacher.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all">
                     <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-4">
                           <img src={teacher.avatar} alt={teacher.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm" />
                           <div>
                              <h3 className="font-bold text-lg text-gray-900">{teacher.name}</h3>
                              <p className="text-blue-600 font-medium text-sm">{teacher.specialization}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                 <span className="flex items-center gap-1"><Mail size={12} /> {teacher.email}</span>
                                 <span className="flex items-center gap-1"><Phone size={12} /> {teacher.phone || 'N/A'}</span>
                              </div>
                           </div>
                        </div>
                        <button className="text-gray-300 hover:text-gray-600"><MoreVertical size={20} /></button>
                     </div>

                     <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                           <p className="text-xs text-gray-500 mb-1">Hired Date</p>
                           <p className="font-bold text-gray-900 flex items-center gap-2"><Calendar size={14} /> {teacher.hiringDate}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                           <p className="text-xs text-gray-500 mb-1">Employment</p>
                           <p className="font-bold text-gray-900 flex items-center gap-2"><Briefcase size={14} /> {teacher.employmentType}</p>
                        </div>
                     </div>

                     <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Subject Distribution</h4>
                        <table className="w-full text-sm">
                           <thead>
                              <tr className="text-gray-400 text-xs text-left">
                                 <th className="pb-2 font-medium">Class</th>
                                 <th className="pb-2 font-medium">Subject</th>
                                 <th className="pb-2 font-medium text-right">Hrs/Week</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {assignedClassDetails.map((cls, idx) => (
                                 <tr key={idx}>
                                    <td className="py-2 font-bold text-gray-800">{cls.name} <span className="text-gray-400 font-normal text-xs ml-1">({cls.gradeLevel})</span></td>
                                    <td className="py-2 text-gray-600">{teacher.specialization}</td>
                                    <td className="py-2 text-right font-mono font-medium">4</td>
                                 </tr>
                              ))}
                              {assignedClassDetails.length === 0 && (
                                 <tr><td colSpan={3} className="py-2 text-center text-gray-400 italic">No classes assigned</td></tr>
                              )}
                           </tbody>
                        </table>
                        <div className="mt-4 flex justify-between items-center text-xs">
                           <span className="text-gray-500">Total Academic Load</span>
                           <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">{teacher.academicLoad} Hours / Week</span>
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>
      </div>
   );

   // 3. Admin Management View
   const AdminListView = () => (
      <div className="space-y-6 animate-fadeIn">
         <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 space-y-2">
               <div className="flex items-center gap-2 text-indigo-300 text-sm font-bold uppercase tracking-wider">
                  <ShieldCheck size={16} /> Administration Hub
               </div>
               <h2 className="text-3xl font-bold">Manage Roles & Permissions</h2>
               <p className="text-indigo-200 max-w-xl">Configure system access for co-teachers, registrars, and academic coordinators. Ensure RBAC compliance.</p>
            </div>
            <Button variant="secondary" onClick={() => setIsAddAdminOpen(true)} className="relative z-10 mt-6 md:mt-0">
               <Plus size={16} /> Add New Admin
            </Button>
         </div>

         <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
               <thead className="bg-gray-50 text-gray-500 font-semibold text-sm">
                  <tr>
                     <th className="px-6 py-4">User</th>
                     <th className="px-6 py-4">Role Title</th>
                     <th className="px-6 py-4">Department</th>
                     <th className="px-6 py-4">Active Status</th>
                     <th className="px-6 py-4">Permissions</th>
                     <th className="px-6 py-4"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {adminsList.map(admin => (
                     <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <img src={admin.avatar} className="w-10 h-10 rounded-full" alt="" />
                              <div>
                                 <p className="font-bold text-gray-900 text-sm">{admin.name}</p>
                                 <p className="text-xs text-gray-400">{admin.email}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700">{admin.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{admin.department}</td>
                        <td className="px-6 py-4">
                           <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div> {admin.lastActive}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-wrap gap-1">
                              {admin.permissions.slice(0, 2).map(p => (
                                 <span key={p} className="text-[10px] bg-gray-100 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                    {p.replace('_', ' ')}
                                 </span>
                              ))}
                              {admin.permissions.length > 2 && (
                                 <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                    +{admin.permissions.length - 2}
                                 </span>
                              )}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button className="text-gray-400 hover:text-indigo-600"><Settings size={18} /></button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );

   // --- MAIN RENDER ---

   if (selectedStudent) {
      return <StudentProfile student={selectedStudent} language={language} onBack={() => setSelectedStudent(null)} />;
   }

   return (
      <div className="space-y-6">

         {/* 1. UPLOAD MODAL (Generic) */}
         {uploadModalType && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-fadeIn">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-bold text-gray-900">Bulk Import {uploadModalType === 'student' ? 'Students' : 'Teachers'}</h3>
                     <button onClick={() => setUploadModalType(null)} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:bg-gray-50 transition-colors cursor-pointer mb-6">
                     <FileSpreadsheet size={48} className="mx-auto text-green-600 mb-4" />
                     <p className="font-bold text-gray-900">Click to upload or drag & drop</p>
                     <p className="text-sm text-gray-500">CSV, Excel (max 10MB)</p>
                  </div>

                  <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-8">
                     <span className="flex items-center gap-2"><Download size={16} /> Download Template</span>
                     <button className="font-bold hover:underline">Get CSV</button>
                  </div>

                  <div className="flex gap-4">
                     <Button variant="secondary" className="flex-1" onClick={() => setUploadModalType(null)}>Cancel</Button>
                     <Button variant="primary" className="flex-1" onClick={() => setUploadModalType(null)}>Start Import</Button>
                  </div>
               </div>
            </div>
         )}

         {/* 2. ADD STUDENT MODAL */}
         {isAddStudentOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                     <div>
                        <h3 className="text-xl font-bold text-gray-900">Enroll New Student</h3>
                        <p className="text-sm text-gray-500">Add a single student record to the system.</p>
                     </div>
                     <button onClick={() => setIsAddStudentOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
                  </div>

                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                           <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                           <input
                              type="text"
                              placeholder="e.g. Ali Ahmed"
                              value={newStudent.name}
                              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Grade Level</label>
                           <select
                              value={newStudent.grade}
                              onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                           >
                              {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => <option key={g} value={g}>{g}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Date of Birth</label>
                           <input
                              type="date"
                              value={newStudent.dob}
                              onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                           />
                        </div>
                     </div>

                     <div className="border-t border-gray-100 pt-6">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Users size={18} /> Guardian Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="md:col-span-2">
                              <label className="block text-sm font-bold text-gray-700 mb-2">Parent/Guardian Name</label>
                              <input
                                 type="text"
                                 placeholder="e.g. Ahmed Senior"
                                 value={newStudent.parentName}
                                 onChange={(e) => setNewStudent({ ...newStudent, parentName: e.target.value })}
                                 className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                              <input
                                 type="tel"
                                 placeholder="+966 ..."
                                 value={newStudent.parentPhone}
                                 onChange={(e) => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                                 className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                              <input
                                 type="email"
                                 placeholder="parent@example.com"
                                 value={newStudent.parentEmail}
                                 onChange={(e) => setNewStudent({ ...newStudent, parentEmail: e.target.value })}
                                 className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                              />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4 mt-8 pt-4 border-t border-gray-100">
                     <Button variant="secondary" className="flex-1" onClick={() => setIsAddStudentOpen(false)}>Cancel</Button>
                     <Button variant="primary" className="flex-1" onClick={handleCreateStudent}>Create Student</Button>
                  </div>
               </div>
            </div>
         )}

         {/* 3. ADD TEACHER MODAL */}
         {isAddTeacherOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-fadeIn">
                  <div className="flex justify-between items-center mb-6">
                     <div>
                        <h3 className="text-xl font-bold text-gray-900">Add Faculty Member</h3>
                        <p className="text-sm text-gray-500">Create a new teacher profile and assign subjects.</p>
                     </div>
                     <button onClick={() => setIsAddTeacherOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                        <input
                           type="text"
                           placeholder="e.g. Sarah Al-Majed"
                           value={newTeacher.name}
                           onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                           className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                        <input
                           type="email"
                           placeholder="teacher@school.edu"
                           value={newTeacher.email}
                           onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                           className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Hiring Date</label>
                        <input
                           type="date"
                           value={newTeacher.hiringDate}
                           onChange={(e) => setNewTeacher({ ...newTeacher, hiringDate: e.target.value })}
                           className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Employment Type</label>
                        <select
                           value={newTeacher.type}
                           onChange={(e) => setNewTeacher({ ...newTeacher, type: e.target.value as any })}
                           className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                           <option value="Full-time">Full-time</option>
                           <option value="Part-time">Part-time</option>
                           <option value="Contract">Contract</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Primary Subject</label>
                        <select
                           value={newTeacher.subject}
                           onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                           className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                           <option value="Mathematics">Mathematics</option>
                           <option value="Science">Science</option>
                           <option value="English">English</option>
                           <option value="Arabic">Arabic</option>
                           <option value="Physics">Physics</option>
                           <option value="History">History</option>
                        </select>
                     </div>
                  </div>

                  <div className="flex gap-4 mt-8 pt-4 border-t border-gray-100">
                     <Button variant="secondary" className="flex-1" onClick={() => setIsAddTeacherOpen(false)}>Cancel</Button>
                     <Button variant="primary" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleCreateTeacher}>Create Teacher</Button>
                  </div>
               </div>
            </div>
         )}

         {/* 4. ADD ADMIN MODAL */}
         {isAddAdminOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                     <div>
                        <h3 className="text-xl font-bold text-gray-900">Configure Administrator</h3>
                        <p className="text-sm text-gray-500">Assign role-based access control (RBAC) permissions.</p>
                     </div>
                     <button onClick={() => setIsAddAdminOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={24} /></button>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-8">
                     {/* Left: Basic Info */}
                     <div className="flex-1 space-y-4">
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Role Template</label>
                           <div className="relative">
                              <select
                                 value={selectedAdminTemplate}
                                 onChange={(e) => handleTemplateChange(e.target.value)}
                                 className="w-full border border-gray-200 rounded-xl pl-4 pr-10 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 appearance-none font-medium"
                              >
                                 <option value="Custom">Custom Configuration</option>
                                 {Object.keys(ADMIN_TEMPLATES).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                 ))}
                              </select>
                              <LayoutTemplate size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                           </div>
                           <p className="text-xs text-gray-500 mt-1">Select a template to auto-configure permissions.</p>
                        </div>

                        <hr className="border-gray-100" />

                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                           <input
                              type="text"
                              value={newAdmin.name}
                              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                           <input
                              type="email"
                              value={newAdmin.email}
                              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Role Title</label>
                           <input
                              type="text"
                              placeholder="e.g. Registrar"
                              value={newAdmin.title}
                              onChange={(e) => setNewAdmin({ ...newAdmin, title: e.target.value })}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">Department</label>
                           <select
                              value={newAdmin.department}
                              onChange={(e) => setNewAdmin({ ...newAdmin, department: e.target.value })}
                              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                           >
                              <option>Administration</option>
                              <option>Academics</option>
                              <option>Admissions</option>
                              <option>Finance</option>
                              <option>IT Support</option>
                           </select>
                        </div>
                     </div>

                     {/* Right: Permissions */}
                     <div className="flex-1 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="font-bold text-gray-900 flex items-center gap-2"><Lock size={16} /> Access Permissions</h4>
                           <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">{adminPermissions.length} Active</span>
                        </div>

                        <div className="space-y-6 h-[400px] overflow-y-auto pr-2">
                           {PERMISSION_GROUPS.map((group) => (
                              <div key={group.category}>
                                 <p className="text-xs font-bold text-gray-500 uppercase mb-3 sticky top-0 bg-gray-50 py-1">{group.category}</p>
                                 <div className="space-y-2">
                                    {group.perms.map((perm) => (
                                       <div key={perm.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                          <span className="text-sm font-medium text-gray-700">{perm.label}</span>
                                          <button
                                             onClick={() => togglePermission(perm.id)}
                                             className={`transition-colors ${adminPermissions.includes(perm.id) ? 'text-green-500' : 'text-gray-300'}`}
                                          >
                                             {adminPermissions.includes(perm.id) ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                          </button>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4 mt-8 pt-4 border-t border-gray-100">
                     <Button variant="secondary" className="flex-1" onClick={() => setIsAddAdminOpen(false)}>Cancel</Button>
                     <Button variant="primary" className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleCreateAdmin}>Create Administrator</Button>
                  </div>
               </div>
            </div>
         )}

         {/* Header & Tabs */}
         <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
            <div>
               <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">User Management</h1>
               <p className="text-gray-500">Directory and access control for the institution.</p>
            </div>

            {/* Permission-aware Tabs */}
            <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm flex">
               <button
                  onClick={() => setActiveTab('students')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'students' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
               >
                  <GraduationCap size={16} /> Students
               </button>

               {(role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) && (
                  <>
                     <button
                        onClick={() => setActiveTab('teachers')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'teachers' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                     >
                        <Briefcase size={16} /> Teachers
                     </button>
                     <button
                        onClick={() => setActiveTab('admins')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${activeTab === 'admins' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                     >
                        <ShieldCheck size={16} /> Admins
                     </button>
                  </>
               )}
            </div>
         </div>

         {/* View Content */}
         {activeTab === 'students' && <StudentListView />}
         {activeTab === 'teachers' && <TeacherListView />}
         {activeTab === 'admins' && <AdminListView />}
      </div>
   );
};