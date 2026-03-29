import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { dalje } from '../store/slices/authSlice';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minuta

export function useInactivityTimer(isAuthenticated) {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const timerRef  = useRef(null);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dispatch(dalje({ arsyeja: 'timeout' }));
      navigate('/hyrje', { replace: true });
    }, TIMEOUT_MS);
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimeout(timerRef.current);
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    reset();

    return () => {
      clearTimeout(timerRef.current);
      events.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, [isAuthenticated, reset]);
}
