interface BrandLockupProps {
  compact?: boolean;
  showDescriptor?: boolean;
}

const BrandLockup = ({
  compact = false,
  showDescriptor = true,
}: BrandLockupProps) => (
  <span className={`brand-lockup${compact ? " is-compact" : ""}`}>
    <span className="brand-wordmark">
      Resumide
      <svg
        className="brand-leaf"
        viewBox="0 0 28 34"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M25.2 1.8C13.5 3.4 4.6 9.4 2.1 20.5c-1.2 5.1 1.1 9.2 5.8 11.2 8.8-4.5 15.2-13.1 17.3-29.9Z" />
        <path d="M5.4 29.8C10.1 22.1 15 15.7 22 8.9" />
      </svg>
    </span>
    {showDescriptor ? (
      <span className="brand-descriptor">Evidence desk</span>
    ) : null}
  </span>
);

export default BrandLockup;
