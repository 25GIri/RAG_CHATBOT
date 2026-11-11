import { Link } from 'react-router-dom';

const PROMPTS = [
  'Summarize the main points of these documents',
  'What are the key dates, deadlines or figures mentioned?',
  'What conclusions or recommendations are made?',
];

export default function WelcomeScreen({ readyCount, onPrompt }) {
  return (
    <div className="welcome">
      <h1>Ask your documents</h1>
      <p className="muted">
        Answers come only from your uploaded PDF and Word files, with the page and section they were found on.
      </p>
      {readyCount === 0 ? (
        <Link className="btn btn-primary" to="/documents/upload">Upload a document</Link>
      ) : (
        <ul className="prompt-list">
          {PROMPTS.map((p) => (
            <li key={p}><button className="prompt" onClick={() => onPrompt(p)}>{p}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
