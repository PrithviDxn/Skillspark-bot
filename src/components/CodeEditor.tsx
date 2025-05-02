import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CodeEditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  height?: string;
  language?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  initialValue = '// Write your code here',
  onChange,
  onSave,
  height = '400px',
  language = 'javascript',
}) => {
  const [code, setCode] = useState(initialValue);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  
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

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Code Editor</h3>
        <div className="flex items-center gap-2">
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="csharp">C#</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
              <SelectItem value="php">PHP</SelectItem>
              <SelectItem value="ruby">Ruby</SelectItem>
              <SelectItem value="go">Go</SelectItem>
              <SelectItem value="rust">Rust</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="css">CSS</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSave}>Save Code</Button>
        </div>
      </div>
      <Editor
        height={height}
        language={selectedLanguage}
        value={code}
        onChange={handleEditorChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
