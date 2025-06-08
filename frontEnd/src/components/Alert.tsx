interface Props {
  name: string;
  color: string;
  onClick: () => void;
}

function Alert({ name, color, onClick }: Props) {
  return (
    <div
      className={"alert alert-" + color + " alert-dismissible fade show"}
      role="alert"
    >
      {name}
      <button
        type="button"
        className="btn-close"
        data-bs-dismiss="alert"
        aria-label="Close"
        onClick={onClick}
      ></button>
    </div>
  );
}

export default Alert;
