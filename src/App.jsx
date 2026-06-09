import { HashRouter as BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ClassList from './pages/ClassList.jsx';
import StudentList from './pages/StudentList.jsx';
import GradingInput from './pages/GradingInput.jsx';
import ClassPreview from './pages/ClassPreview.jsx';
import UnitManagement from './pages/UnitManagement.jsx';
import SentenceManagement from './pages/SentenceManagement.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ClassList />} />
          <Route path="/class/:className" element={<StudentList />} />
          <Route path="/student/:studentId/grade" element={<GradingInput />} />
          <Route path="/class/:className/preview" element={<ClassPreview />} />
          <Route path="/units" element={<UnitManagement />} />
          <Route path="/sentences" element={<SentenceManagement />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
