import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeRenderer = ({
  code,
  language = 'javascript',
  showLineNumbers = true,
}) => {
  return (
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      showLineNumbers={showLineNumbers}
      wrapLines={true}
      wrapLongLines={true}
      customStyle={{
        padding: '1rem',
        borderRadius: '0.5rem',
        fontSize: '0.9rem',
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};

export default CodeRenderer; 