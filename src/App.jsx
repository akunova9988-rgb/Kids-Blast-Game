import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Home from "./pages/Home";
import TeacherLogin from "./pages/TeacherLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import Student from "./pages/Student";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";

function ProtectedTeacher({ children }) {
  const { teacherLoggedIn } = useApp();
  if (!teacherLoggedIn) return <Navigate to="/teacher" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/teacher" element={<TeacherLogin />} />
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedTeacher>
            <TeacherDashboard />
          </ProtectedTeacher>
        }
      />
      <Route path="/student" element={<Student />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/results" element={<Results />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
