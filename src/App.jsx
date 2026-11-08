import { AppProvider, useApp } from "./context/AppContext";
import Home from "./pages/Home";
import TeacherLogin from "./pages/TeacherLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import Student from "./pages/Student";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";

function AppViews() {
  const { view, viewData, teacherLoggedIn, navigate } = useApp();

  switch (view) {
    case "home":
      return <Home />;
    case "teacher-login":
      return <TeacherLogin />;
    case "teacher-dashboard":
      if (!teacherLoggedIn) {
        navigate("teacher-login");
        return null;
      }
      return <TeacherDashboard />;
    case "student-login":
      return <Student />;
    case "quiz":
      return <Quiz />;
    case "results":
      return <Results data={viewData} />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppViews />
    </AppProvider>
  );
}
