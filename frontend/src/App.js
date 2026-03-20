import ProjectList from './components/ProjectList';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-700 text-white px-6 py-4 shadow">
        <h1 className="text-xl font-bold tracking-wide">✅ Task Manager</h1>
      </nav>
      <main>
        <ProjectList />
      </main>
    </div>
  );
}

export default App;