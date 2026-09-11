import { useId } from "react";

const ScoreCircle = ({ score }: { score: number }) => {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const progress = safeScore / 100;
  const strokeDashoffset = circumference * (1 - progress);
  const gradientId = `score-gradient-${useId().replaceAll(":", "")}`;

  return (
    <div
      className="relative w-[100px] h-[100px]"
      role="img"
      aria-label={`Resume score ${safeScore} out of 100`}
    >
      <svg
        height="100%"
        width="100%"
        viewBox="0 0 100 100"
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={normalizedRadius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="transparent"
        />
        {/* Partial circle with gradient */}
        <defs>
          <linearGradient id={gradientId} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF97AD" />
            <stop offset="100%" stopColor="#5171FF" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={normalizedRadius}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>

      {/* Score and issues */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-semibold text-sm">{`${safeScore}/100`}</span>
      </div>
    </div>
  );
};

export default ScoreCircle;
