import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';

interface CodeEditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  height?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialValue = '// Write your code here',
  onChange,
  onSave,
  height = '400px',
}) => {
  const [code, setCode] = useState(initialValue);
  
  // Update code when initialValue changes
  useEffect(() => {
    if (initialValue) {
      setCode(initialValue);
    }
  }, [initialValue]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      if (onChange) {
        onChange(value);
      }
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(code);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Code Editor</h3>
      </div>
      <Editor
        height={height}
        language="javascript"
        value={code}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          // Disable suggestions and intellisense
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          parameterHints: { enabled: false },
          wordBasedSuggestions: 'off',
          suggest: { showMethods: false, showFunctions: false, showClasses: false },
          inlineSuggest: { enabled: false },
          hover: { enabled: false },
          // Use 'off' instead of false for these properties to avoid TypeScript errors
          definitionLinkOpensInPeek: true
        }}
      />
    </div>
  );
};

export default CodeEditor;
