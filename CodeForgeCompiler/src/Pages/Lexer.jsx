import React, { useState } from 'react';
import IRViewer from '../Component/IRViewer';
import tokenize, { funcKeywords } from '../utils/Lexer';
import Parser from '../utils/SyntaxAnalyzer';
import buildSymbolTable from '../utils/SymbolTableBuilder';
import SemanticAnalyzer from '../utils/SemanticAnalyzer';
import CodeGenerator from '../utils/CodeGenerator';
import IntermediateCodeGenerator from '../utils/IntermediateCodeGenerator';
import { AssemblyInterpreter } from '../utils/code_executor';
// import CodeExecutor if you wish to render it, but not used here

// Styled button
const Variant = { primary: 'primary', secondary: 'secondary' };
function CustomButton({ onClick, children, variant = Variant.primary }) {
    const base = 'w-full px-4 py-2 rounded transition';
    const styles = variant === Variant.primary
        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
        : 'bg-gray-300 text-gray-800 hover:bg-gray-400';
    return (
        <button onClick={onClick} className={`${base} ${styles}`}>{children}</button>
    );
}

const tabs = ['Code Output', 'Errors', 'Tokens', 'Symbol Table', 'Assembly', 'Intermediate Code'];

export default function CodeForge() {
    const [code, setCode] = useState(`// Paste your code here
nmb a =. 10;
flat b =. 2.5;
Sring msg =. "Hello";
buul flag =. false;
printO("a:", a, "b:", b, "msg:", msg, "flag:", flag);`);
    const [results, setResults] = useState({
        output: [],
        tokens: [],
        table: {},
        asm: '',
        ir: [],
        errors: []
    });
    const [activeTab, setActiveTab] = useState('Code Output');

    // Run compilation
    const handleRun = () => {
        const errors = [];
        const { tokens, errors: lexErrs } = tokenize(code);
        if (lexErrs.length) errors.push(...lexErrs.map(e => `Lexical: ${e}`));

        const synErrs = new Parser(tokens).parse();
        if (synErrs.length) errors.push(...synErrs.map(e => `Syntax: ${e}`));

        const symTab = buildSymbolTable(tokens, funcKeywords);
        const semErrs = new SemanticAnalyzer(symTab, tokens).analyze();
        if (semErrs.length) errors.push(...semErrs.map(e => `Semantic: ${e}`));

        let asm = '';
        let ir = [];
        let output = [];

        if (!errors.length) {
            asm = new CodeGenerator(symTab, tokens).generate();
            ir = new IntermediateCodeGenerator(symTab, tokens).generate();
            try {
                const interp = new AssemblyInterpreter();
                output = interp.execute(asm);
            } catch (e) {
                errors.push(`Runtime: ${e.message}`);
            }
        }

        setResults({ output, tokens, table: symTab, asm, ir, errors });
        setActiveTab(errors.length ? 'Errors' : 'Code Output');
    };

    // Clear results
    const handleClear = () => setResults({
        output: [],
        tokens: [],
        table: {},
        asm: '',
        ir: [],
        errors: []
    });

    // Save current code to file
    const handleSaveToFile = () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'code.codeforge';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Load code from file
    const handleLoadFromFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setCode(reader.result);
        reader.readAsText(file);
    };


    const filteredTable = Object.fromEntries(
        Object.entries(results.table).filter(([k]) => !funcKeywords.includes(k))
    );
    // Or, to show all:
    // const filteredTable = results.table;

    const basePanel = 'h-full overflow-auto bg-white p-4 rounded-lg shadow';
    const renderContent = () => {
        switch (activeTab) {
            case 'Code Output':
                return (
                    <div className={basePanel}>
                        {results.output.length
                            ? <pre className="font-mono whitespace-pre-wrap">{results.output.join('\n')}</pre>
                            : <pre className="font-mono">// no output</pre>
                        }
                    </div>
                );
            case 'Errors':
                return (
                    <div className={basePanel}>
                        {results.errors.length
                            ? <ul className="list-disc list-inside text-red-600">
                                {results.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                            : <p>No errors detected.</p>}
                    </div>
                );
            case 'Tokens':
                return (
                    <div className={basePanel}>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-indigo-100">
                                <tr><th className="p-2">Type</th><th className="p-2">Lexeme</th><th className="p-2">Line</th></tr>
                            </thead>
                            <tbody>
                                {results.tokens.map(([t, l, ln], i) => (
                                    <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                                        <td className="p-2 font-mono text-indigo-700">{t}</td>
                                        <td className="p-2 font-mono">{l}</td>
                                        <td className="p-2 text-gray-600">{ln}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'Symbol Table':
                return (
                    <div className={basePanel}>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-indigo-100">
                                <tr>
                                    <th className="p-2">Name</th>
                                    <th className="p-2">Data Type</th>
                                    <th className="p-2">Token Type</th>
                                    <th className="p-2">Line</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(filteredTable).map(([name, info], i) => (
                                    <tr key={name} className={i % 2 ? 'bg-gray-50' : ''}>
                                        <td className="p-2 font-mono text-indigo-700">{name}</td>
                                        <td className="p-2">{info.data_type}</td>
                                        <td className="p-2">{info.token_type}</td>
                                        <td className="p-2 text-gray-600">{info.line_number ?? '-'}</td>
                                        {/* <td className="p-2 italic text-gray-600">{info.value ?? '-'}</td> */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            case 'Assembly':
                return (
                    <pre className="font-mono text-sm bg-gray-50 p-4 rounded-lg shadow h-full overflow-auto">
                        {results.asm || '// no assembly generated'}
                    </pre>
                );
            case 'Intermediate Code':
                return (
                    <div className={basePanel}>
                        <IRViewer ir={results.ir} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <aside className="w-1/4 p-6 space-y-6 bg-white border-r">
                <h1 className="text-2xl font-bold text-indigo-600">CodeForge</h1>
                <CustomButton onClick={handleRun}>Run</CustomButton>
                <CustomButton variant={Variant.secondary} onClick={handleClear}>Clear</CustomButton>
                <CustomButton variant={Variant.secondary} onClick={handleSaveToFile}>Save to File</CustomButton>
                <div>
                    <label className="block text-sm text-gray-600">Load from File</label>
                    <input type="file" accept=".codeforge,.txt" onChange={handleLoadFromFile} className="w-full text-sm" />
                </div>
                <nav className="mt-8 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`w-full text-left px-3 py-2 rounded transition ${
                                activeTab === tab ? 'bg-indigo-500 text-white' : 'text-gray-700 hover:bg-indigo-100'
                            }`}
                        >{tab}</button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 p-6 flex flex-col gap-6">
                <textarea
                    className="w-full h-100 p-4 font-mono rounded-lg shadow border border-gray-300"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                />
                {renderContent()}
            </main>
        </div>
    );
}
