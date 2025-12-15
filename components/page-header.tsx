type PageHeaderProps = {
  title: string;
  description?: string;
  info?: React.ReactNode;
  actionBtns?: React.ReactNode;
};

const PageHeader = ({
  title,
  description,
  actionBtns,
  info,
}: PageHeaderProps) => {
  return (
    <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
        {info && <div className="flex items-center gap-2 mt-1">{info}</div>}
      </div>
      {actionBtns && (
        <div className="flex items-center gap-2 text-wrap">{actionBtns}</div>
      )}
    </div>
  );
};

export default PageHeader;
