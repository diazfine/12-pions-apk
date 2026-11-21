import React from 'react';
import { Tournament, TournamentProps } from './Tournament';

export const TournamentScreen: React.FC<TournamentProps> = (props) => {
  return <Tournament {...props} />;
};

export { Tournament };
