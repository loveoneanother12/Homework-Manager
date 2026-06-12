import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ClassList from './pages/ClassList.jsx';
import StudentList from './pages/StudentList.jsx';
import ClassPreview from './pages/ClassPreview.jsx';
import UnitManagement from './pages/UnitManagement.jsx';
import SentenceManagement from './pages/SentenceManagement.jsx';
import ManagePage from './pages/ManagePage.jsx';
import StudentHistory from './pages/StudentHistory.jsx';
import TrashPage from './pages/TrashPage.jsx';
import HomeworkList from './pages/HomeworkList.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ClassList />} />
          <Route path="/manage" element={<ManagePage />} />
          <Route path="/student/:studentId/history" element={<StudentHistory />} />
          <Route path="/class/:className" element={<HomeworkList />} />
          <Route path="/class/:className/hw/:homeworkId" element={<StudentList />} />
          <Route path="/class/:className/hw/:homeworkId/preview" element={<ClassPreview />} />
          <Route path="/units" element={<UnitManagement />} />
          <Route path="/sentences" element={<SentenceManagement />} />
          <Route path="/trash" element={<TrashPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
