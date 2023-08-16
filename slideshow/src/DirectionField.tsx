import { SilkeTextSmall, SilkeBox, SilkeIcon } from '@vev/silke';
import React from 'react';

function DirectionField(props) {
  console.log('props', props);

  const directions = {
    HORIZONTAL: 'arrow.right',
    HORIZONTAL_REVERSE: 'arrow.left',
    VERTICAL: 'arrow.down',
    VERTICAL_REVERSE: 'arrow.up',
  };

  return (
    <SilkeBox>
      <SilkeTextSmall weight="strong" style={{ width: '80px' }}>
        Direction
      </SilkeTextSmall>
      <SilkeBox>
        {Object.keys(directions).map((direction, i) => (
          <SilkeBox
            key={i}
            style={{
              fontSize: '16px',
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
