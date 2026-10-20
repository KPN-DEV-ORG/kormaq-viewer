import React, { ReactNode, useCallback, useContext } from 'react';
import { MenuContext } from './Menu';

type ItemProps = {
  label: string;
  secondaryLabel?: string;
  description?: string;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  useIconSpace?: boolean;
};

const Item = ({
  label,
  secondaryLabel,
  description,
  icon,
  rightIcon,
  onClick,
  onMouseEnter,
  onMouseLeave,
  useIconSpace = false,
}: ItemProps) => {
  const { hideMenu } = useContext(MenuContext);

  const onClickHandler = useCallback(() => {
    hideMenu();
    onClick?.();
  }, [hideMenu, onClick]);

  return (
    <div
      className={`hover:bg-accent flex w-full flex-shrink-0 cursor-pointer px-2 text-base leading-[18px] hover:rounded ${
        description ? 'min-h-8 flex-col items-stretch py-1' : 'h-8 items-center'
      }`}
      onClick={onClickHandler}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {(icon || useIconSpace) && (
        <div className="flex w-7 flex-shrink-0 items-center justify-center">{icon}</div>
      )}
      <span className="flex w-full items-center">
        <span className="flex-grow">{label}</span>
        {secondaryLabel && (
          <span className="text-muted-foreground ml-2 flex-shrink-0">{secondaryLabel}</span>
        )}
        {rightIcon && <span className="ml-2 flex-shrink-0">{rightIcon}</span>}
      </span>
      {description && (
        <span className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-4">
          {description}
        </span>
      )}
    </div>
  );
};

export default Item;
