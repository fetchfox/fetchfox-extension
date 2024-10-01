import { IoIosCheckmark } from "react-icons/io";
import { mainColor } from "../../lib/constants";

export const Checkbox = ({ size, checked, disabled, onClick, children }) => {
  size ||= 18;
  return (
    <div
      onClick={onClick}
      style={{
        cursor: "default",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        gap: 5,
        userSelect: "none",
      }}
    >
      <div>
        {checked && (
          <div
            style={{
              background: mainColor,
              border: "1px solid " + mainColor,
              borderRadius: size / 2,
              width: size,
              height: size,
            }}
          >
            <IoIosCheckmark
              size={size * 1.25}
              style={{ color: "white", marginLeft: -3, marginTop: -3 }}
            />
          </div>
        )}
        {!checked && (
          <div
            style={{
              border: "1px solid white",
              borderRadius: size / 2,
              width: size,
              height: size,
            }}
          ></div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
};
