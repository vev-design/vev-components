import { SilkeTextSmall, SilkeBox, SilkeIcon } from '@vev/silke';
import React from 'react';

function DirectionField(props) {
  const isSlide = props.context?.value?.animation === 'slide';
  const is3d = props.context?.value?.animation === '3d';

  const directions = {
    HORIZONTAL: 'arrow.right',
    HORIZONTAL_REVERSE: 'arrow.left',
    VERTICAL: 'arrow.up',
    VERTICAL_REVERSE: 'arrow.down',
  };

  return (
    <SilkeBox>
      <SilkeTextSmall style={{ width: '80px' }}>Direction</SilkeTextSmall>
      <SilkeBox>
        {Object.keys(directions)
          .slice(0, isSlide || is3d ? 4 : 2)
          .map((direction, i) => (
            <SilkeBox
              key={i}
              style={{
                fontSize: '14px',
                padding: '5px',
                cursor: 'pointer',
                margin: '0 5px',
                background: props.value === direction ? '#2F2F2F' : 'none',
                borderRadius: '4px',
              }}
              onClick={() => {
                props.onChange(direction);
              }}
            >
              <SilkeIcon icon={directions[direction]} />
            </SilkeBox>
          ))}
      </SilkeBox>
    </SilkeBox>
  );
}

export default DirectionField;
