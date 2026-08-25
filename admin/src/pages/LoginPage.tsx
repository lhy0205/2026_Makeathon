import { useState, type FormEvent } from 'react';
import { useAuth } from '../AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <span className="login-mark" aria-hidden>💊</span>
          <h1 className="login-title">Medi-Self 관리자</h1>
          <p className="login-sub">관리자 계정으로 로그인하세요.</p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="email">이메일</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@medi.com"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="password">비밀번호</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
          />
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
          {submitting ? '확인 중…' : '로그인'}
        </button>

        <p className="login-note">
          일반 사용자 계정으로는 들어올 수 없습니다.
        </p>
      </form>
    </div>
  );
}
