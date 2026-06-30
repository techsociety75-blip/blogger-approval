import React from 'react';

export const AuthContext = React.createContext({
  user: null,
  loading: false,
  error: null,
});
