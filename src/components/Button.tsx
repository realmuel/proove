type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({ className = "", ...props }: Props) {
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-3 font-medium active:scale-[0.98] transition ${className}`}
    />
  );
}