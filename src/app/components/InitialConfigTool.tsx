import React from 'react';

export type InitialConfigType = 'random' | 'glider' | 'empty';

interface InitialConfigToolProps {
  onConfigurationSet: (config: InitialConfigType) => void;
}

const InitialConfigTool: React.FC<InitialConfigToolProps> = ({ onConfigurationSet }) => {
  return (
    <div>
      <button onClick={() => onConfigurationSet('random')}>Random</button>
      <button onClick={() => onConfigurationSet('glider')}>Glider</button>
      <button onClick={() => onConfigurationSet('empty')}>Empty</button>
    </div>
  );
};

export default InitialConfigTool;