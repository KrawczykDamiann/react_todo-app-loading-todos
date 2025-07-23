/* eslint-disable no-console */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import classNames from 'classnames';

import { UserWarning } from './UserWarning';
import {
  getTodos,
  createTodo,
  deleteTodo,
  updateTodo,
  USER_ID,
} from './api/todos';
import { Todo } from './types/Todo';

type FilterStatus = 'all' | 'active' | 'completed';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState('');
  const [filterBy, setFilterBy] = useState<FilterStatus>('all');
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [editedTitle, setEditedTitle] = useState('');

  const newTodoFieldRef = useRef<HTMLInputElement>(null);

  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 3000);
  };

  useEffect(() => {
    console.log('--- App Mounted --- Focusing input');
    newTodoFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    console.log('--- Fetching Todos ---');
    getTodos()
      .then(setTodos)
      .catch(() => {
        handleError('Unable to load todos');
      });
  }, []);

  const activeTodos = useMemo(() => todos.filter(t => !t.completed), [todos]);
  const completedTodos = useMemo(() => todos.filter(t => t.completed), [todos]);

  const visibleTodos = useMemo(() => {
    switch (filterBy) {
      case 'active':
        return activeTodos;
      case 'completed':
        return completedTodos;
      default:
        return todos;
    }
  }, [todos, filterBy, activeTodos, completedTodos]);

  const handleAddTodo = (event: React.FormEvent) => {
    console.log('--- Add Todo ---');
    event.preventDefault();
    setError('');

    const trimmedTitle = newTodoTitle.trim();

    if (!trimmedTitle) {
      handleError('Title should not be empty');

      return;
    }

    setTempTodo({
      id: 0,
      title: trimmedTitle,
      completed: false,
      userId: USER_ID,
    });
    setLoadingIds(prev => [...prev, 0]);

    createTodo(trimmedTitle)
      .then(newTodo => {
        setTodos(currentTodos => [...currentTodos, newTodo]);
        setNewTodoTitle('');
      })
      .catch(() => handleError('Unable to add a todo'))
      .finally(() => {
        setTempTodo(null);
        setLoadingIds(prev => prev.filter(id => id !== 0));
        newTodoFieldRef.current?.focus();
      });
  };

  const handleUpdateTodo = (
    todoId: number,
    data: Partial<Omit<Todo, 'id'>>,
  ) => {
    console.log(`--- Update Todo --- ID: ${todoId}`, data);
    setError('');
    setLoadingIds(prev => [...prev, todoId]);

    updateTodo(todoId, data)
      .then(updatedTodo => {
        setTodos(current =>
          current.map(t => (t.id === todoId ? updatedTodo : t)),
        );
      })
      .catch(() => handleError('Unable to update a todo'))
      .finally(() => setLoadingIds(prev => prev.filter(id => id !== todoId)));
  };

  const handleDeleteTodo = (todoId: number) => {
    console.log(`--- Delete Todo --- ID: ${todoId}`);
    setError('');
    setLoadingIds(prev => [...prev, todoId]);

    deleteTodo(todoId)
      .then(() =>
        setTodos(current => current.filter(todo => todo.id !== todoId)),
      )
      .catch(() => handleError('Unable to delete a todo'))
      .finally(() => setLoadingIds(prev => prev.filter(id => id !== todoId)));
  };

  const handleClearCompleted = () => {
    console.log('--- Clear Completed ---');
    const idsToDelete = completedTodos.map(t => t.id);

    setLoadingIds(prev => [...prev, ...idsToDelete]);

    const promises = completedTodos.map(todo => deleteTodo(todo.id));

    Promise.all(promises)
      .then(() => setTodos(current => current.filter(t => !t.completed)))
      .catch(() => handleError('Unable to delete a todo'))
      .finally(() => setLoadingIds([]));
  };

  const handleToggleAll = () => {
    console.log('--- Toggle All ---');
    const areAllCompleted = activeTodos.length === 0;
    const todosToUpdate = areAllCompleted ? todos : activeTodos;

    const promises = todosToUpdate.map(todo => {
      setLoadingIds(prev => [...prev, todo.id]);

      return updateTodo(todo.id, { completed: !areAllCompleted });
    });

    Promise.all(promises)
      .then(() =>
        setTodos(current =>
          current.map(t => ({ ...t, completed: !areAllCompleted })),
        ),
      )
      .catch(() => handleError('Unable to update a todo'))
      .finally(() => setLoadingIds([]));
  };

  const handleEdit = (todo: Todo) => {
    console.log(`--- Start Editing --- ID: ${todo.id}`);
    setEditingTodoId(todo.id);
    setEditedTitle(todo.title);
  };

  const handleSaveEdit = (todoId: number) => {
    console.log(`--- Save Edit --- ID: ${todoId}`);
    const todoToEdit = todos.find(t => t.id === todoId);
    const trimmedTitle = editedTitle.trim();

    if (trimmedTitle === todoToEdit?.title) {
      setEditingTodoId(null);

      return;
    }

    if (!trimmedTitle) {
      handleDeleteTodo(todoId);
    } else {
      handleUpdateTodo(todoId, { title: trimmedTitle });
    }

    setEditingTodoId(null);
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  const todoListToRender = tempTodo
    ? [...visibleTodos, tempTodo]
    : visibleTodos;

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>
      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              type="button"
              className={classNames('todoapp__toggle-all', {
                active: activeTodos.length === 0,
              })}
              data-cy="ToggleAllButton"
              onClick={handleToggleAll}
              aria-label="Toggle all todos"
            />
          )}

          <form onSubmit={handleAddTodo}>
            <input
              data-cy="NewTodoField"
              ref={newTodoFieldRef}
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              disabled={!!tempTodo}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {todoListToRender.map(todo => (
            <div
              data-cy="Todo"
              className={classNames('todo', { completed: todo.completed })}
              key={todo.id}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() =>
                    handleUpdateTodo(todo.id, { completed: !todo.completed })
                  }
                  aria-label={`Toggle ${todo.title}`}
                />
              </label>

              {editingTodoId === todo.id ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSaveEdit(todo.id);
                  }}
                  onBlur={() => handleSaveEdit(todo.id)}
                >
                  <input
                    data-cy="TodoTitleField"
                    type="text"
                    className="todo__title-field"
                    value={editedTitle}
                    onChange={e => setEditedTitle(e.target.value)}
                    onKeyUp={e => e.key === 'Escape' && setEditingTodoId(null)}
                    autoFocus
                    aria-label="Edit todo title"
                  />
                </form>
              ) : (
                <>
                  <span
                    data-cy="TodoTitle"
                    className="todo__title"
                    onDoubleClick={() => handleEdit(todo)}
                  >
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => handleDeleteTodo(todo.id)}
                    aria-label={`Delete ${todo.title}`}
                  >
                    ×
                  </button>
                </>
              )}

              <div
                data-cy="TodoLoader"
                className={classNames('modal overlay', {
                  'is-active': loadingIds.includes(todo.id),
                })}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}
        </section>

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {`${activeTodos.length} items left`}
            </span>
            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={classNames('filter__link', {
                  selected: filterBy === 'all',
                })}
                data-cy="FilterLinkAll"
                onClick={() => setFilterBy('all')}
              >
                All
              </a>
              <a
                href="#/active"
                className={classNames('filter__link', {
                  selected: filterBy === 'active',
                })}
                data-cy="FilterLinkActive"
                onClick={() => setFilterBy('active')}
              >
                Active
              </a>
              <a
                href="#/completed"
                className={classNames('filter__link', {
                  selected: filterBy === 'completed',
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilterBy('completed')}
              >
                Completed
              </a>
            </nav>
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              onClick={handleClearCompleted}
              disabled={completedTodos.length === 0}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: !error },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setError('')}
          aria-label="Hide error message"
        />
        {error}
      </div>
    </div>
  );
};
