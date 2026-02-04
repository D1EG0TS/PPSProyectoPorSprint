import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';
import { Card } from '../Card';
import { Modal } from '../Modal';
import { Table } from '../Table';
import { FormGroup } from '../FormGroup';
import { PaperProvider } from 'react-native-paper';
import { Text } from 'react-native';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaperProvider>{children}</PaperProvider>
);

describe('UI Components', () => {
  describe('Button', () => {
    it('renders correctly', () => {
      const { getByText } = render(<Button>Test Button</Button>, { wrapper: Wrapper });
      expect(getByText('Test Button')).toBeTruthy();
    });
    
    it('handles onPress', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button onPress={onPress}>Press Me</Button>, { wrapper: Wrapper });
      fireEvent.press(getByText('Press Me'));
      expect(onPress).toHaveBeenCalled();
    });
  });

  describe('Card', () => {
    it('renders title and content', () => {
      const { getByText } = render(
        <Card title="Card Title">
          <Text>Card Content</Text>
        </Card>,
        { wrapper: Wrapper }
      );
      expect(getByText('Card Title')).toBeTruthy();
      expect(getByText('Card Content')).toBeTruthy();
    });
  });

  describe('FormGroup', () => {
    it('renders label and error', () => {
      const { getByText } = render(
        <FormGroup label="Test Label" error="Test Error">
          <Text>Input</Text>
        </FormGroup>,
        { wrapper: Wrapper }
      );
      expect(getByText('Test Label')).toBeTruthy();
      expect(getByText('Test Error')).toBeTruthy();
    });
  });
  
  describe('Table', () => {
      it('renders headers and data', () => {
          const columns = [{ key: 'name', label: 'Name' }];
          const data = [{ name: 'John', key: '1' }];
          const { getByText } = render(
              <Table columns={columns} data={data} keyExtractor={(i: any) => i.key} />,
              { wrapper: Wrapper }
          );
          expect(getByText('Name')).toBeTruthy();
          expect(getByText('John')).toBeTruthy();
      })
  })
});
