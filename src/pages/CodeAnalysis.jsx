import React, { useState, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import { Code, Play, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CodeAnalysis = () => {
  const { socket } = useContext(SocketContext);
  const [code, setCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  const analyzeCode = () => {
    if (!code.trim()) {
      toast.error('Please enter some code to analyze');
      return;
    }

    setIsAnalyzing(true);
    toast.success('Starting code analysis...');

    if (socket) {
      socket.emit('analyze-code', {
        code,
        analysisId: Date.now().toString()
      });

      socket.on('analysis-complete', (data) => {
        setResults(data);
        setIsAnalyzing(false);
        toast.success('Analysis complete!');
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Code Analysis</h1>
        <p className="text-gray-600">Analyze your code for bugs, performance issues, and best practices</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Input */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <Code className="h-5 w-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold">Code Input</h2>
          </div>
          
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here for analysis..."
            className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          <button
            onClick={analyzeCode}
            disabled={isAnalyzing}
            className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
          </button>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
            <h2 className="text-lg font-semibold">Analysis Results</h2>
          </div>
          
          {results ? (
            <div className="space-y-4">
              <p className="text-gray-700">Analysis completed successfully!</p>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Analysis results will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeAnalysis;
