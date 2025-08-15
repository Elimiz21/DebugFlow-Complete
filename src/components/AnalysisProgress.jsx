import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { eventBus } from '../utils/EventBus.js';
import { projectProcessor } from '../services/ProjectProcessor.js';

export function AnalysisProgress({ analysisId, onClose, onCancel }) {
  const [progress, setProgress] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!analysisId) return;

    // Get initial progress
    const initialProgress = projectProcessor.getProgress(analysisId);
    if (initialProgress) {
      setProgress(initialProgress);
    }

    // Subscribe to progress updates
    const unsubscribe = eventBus.on('analysis:progress', (data) => {
      if (data.analysisId === analysisId) {
        setProgress(data);
      }
    });

    // Subscribe to completion event
    const unsubscribeComplete = eventBus.on('analysis:completed', (data) => {
      if (data.analysisId === analysisId) {
        setProgress(prev => ({
          ...prev,
          status: data.status,
          progress: 100
        }));
        
        // Auto-hide after completion
        setTimeout(() => {
          setIsVisible(false);
          if (onClose) onClose();
        }, 3000);
      }
    });

    // Subscribe to cancellation event
    const unsubscribeCancel = eventBus.on('analysis:cancelled', (data) => {
      if (data.analysisId === analysisId) {
        setProgress(prev => ({
          ...prev,
          status: 'cancelled',
          currentStep: 'Analysis cancelled'
        }));
        
        setTimeout(() => {
          setIsVisible(false);
          if (onClose) onClose();
        }, 2000);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeComplete();
      unsubscribeCancel();
    };
  }, [analysisId, onClose]);

  const handleCancel = async () => {
    if (onCancel) {
      onCancel();
    } else {
      await projectProcessor.cancelAnalysis(analysisId);
    }
  };

  if (!isVisible || !progress) return null;

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getElapsedTime = () => {
    if (!progress.startTime) return '';
    const elapsed = Date.now() - progress.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Analysis in Progress
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getElapsedTime()}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Progress Content */}
      <div className="p-4">
        {/* Current Step */}
        <div className="mb-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Current Step:
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {progress.currentStep || 'Initializing...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Progress
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              {progress.progress || 0}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getStatusColor()} transition-all duration-300 ease-out`}
              style={{ width: `${progress.progress || 0}%` }}
            />
          </div>
        </div>

        {/* Steps Progress */}
        {progress.totalSteps > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Step {progress.completedSteps + 1} of {progress.totalSteps}
            </p>
          </div>
        )}

        {/* Errors */}
        {progress.errors && progress.errors.length > 0 && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <p className="text-xs text-red-600 dark:text-red-400">
              {progress.errors[progress.errors.length - 1]}
            </p>
          </div>
        )}

        {/* Actions */}
        {progress.status === 'analyzing' && (
          <button
            onClick={handleCancel}
            className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel Analysis
          </button>
        )}

        {progress.status === 'completed' && (
          <div className="text-center">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Analysis completed successfully!
            </p>
          </div>
        )}

        {progress.status === 'failed' && (
          <div className="text-center">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              Analysis failed. Please try again.
            </p>
          </div>
        )}

        {progress.status === 'cancelled' && (
          <div className="text-center">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
              Analysis was cancelled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalysisProgress;