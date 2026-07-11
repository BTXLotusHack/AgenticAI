interface BrandMarkProps {
  readonly inverted?: boolean;
}

export function BrandMark({ inverted = false }: BrandMarkProps) {
  return (
    <span className="brand-mark" data-inverted={inverted ? 'true' : 'false'}>
      <svg
        aria-hidden="true"
        className="brand-mark__icon"
        viewBox="0 0 42 42"
      >
        <path
          d="M12.25 27.5c-5.7 0-8.75-3.05-8.75-7.2 0-4.9 4.15-8.55 9.4-8.55 8.8 0 12.6 16.7 20.15 16.7 3.25 0 5.45-2.05 5.45-4.9 0-3.05-2.2-5.05-5.45-5.05-3.8 0-7.1 3.1-10.2 6.3-3.15 3.2-6.15 6.45-10.6 6.45Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.2"
        />
        <circle cx="12.5" cy="11.85" fill="currentColor" r="2.8" />
        <circle cx="33.2" cy="28.3" fill="currentColor" r="2.8" />
      </svg>
      <span className="brand-mark__word">Loopin</span>
    </span>
  );
}
