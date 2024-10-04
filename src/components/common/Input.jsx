//https://stackoverflow.com/questions/46000544/react-controlled-input-cursor-jumps
import React, { useEffect, useRef, useState } from 'react';

export const Input = (props) => {
   const { value, onChange, ...rest } = props;
   const [cursor, setCursor] = useState(null);
   const ref = useRef(null);

   useEffect(() => {
      const input = ref.current;
      if (input) input.setSelectionRange(cursor, cursor);
   }, [ref, cursor, value]);

   const handleChange = (e) => {
      setCursor(e.target.selectionStart);
      onChange && onChange(e);
   };

   return <input ref={ref} value={value} onChange={handleChange} {...rest} />;
};
