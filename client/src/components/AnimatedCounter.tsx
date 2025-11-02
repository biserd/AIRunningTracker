import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  end: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({ 
  end, 
  duration = 2000, 
  decimals = 0, 
  suffix = "",
  className = ""
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const lastAnimatedEndRef = useRef<number>(0);
  const animationCompleteRef = useRef<boolean>(false);

  useEffect(() => {
    if (end > 0 && !hasAnimated) {
      const animateCount = () => {
        const startTime = Date.now();
        const endTime = startTime + duration;

        const updateCount = () => {
          const now = Date.now();
          const progress = Math.min((now - startTime) / duration, 1);
          
          // Easing function for smooth animation (easeOutQuart)
          const eased = 1 - Math.pow(1 - progress, 4);
          const current = Math.floor(eased * end);

          setCount(current);

          if (now < endTime) {
            requestAnimationFrame(updateCount);
          } else {
            setCount(end);
            lastAnimatedEndRef.current = end;
            animationCompleteRef.current = true;
          }
        };

        requestAnimationFrame(updateCount);
      };

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setHasAnimated(true);
            animateCount();
          }
        },
        { threshold: 0.1 }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => {
        if (elementRef.current) {
          observer.unobserve(elementRef.current);
        }
      };
    }
  }, [end, hasAnimated, duration]);

  // Sync count with end value if end changes after animation completes
  useEffect(() => {
    if (animationCompleteRef.current && end !== lastAnimatedEndRef.current) {
      setCount(end);
      lastAnimatedEndRef.current = end;
    }
  }, [end]);

  const formattedCount = decimals > 0 
    ? count.toFixed(decimals)
    : count.toLocaleString();

  return (
    <span ref={elementRef} className={className}>
      {formattedCount}{suffix}
    </span>
  );
}
