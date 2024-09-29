import React, { useState, useEffect, useRef } from 'react';
import Textarea from 'react-expanding-textarea';
import { Loading } from '../common/Loading';
import { FaArrowRight } from 'react-icons/fa';

export const InputPrompt = ({ onSubmit, onChange, prompt, loading, disabled }) => {
  const timeoutRef = useRef(null);
  const handleSubmit = (e) => {
    if (loading) return;
    if (disabled) return;
    onSubmit(e);
  };

  const handleKeyDown = (e) => {
    if (e.key == 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else {
      console.log('handleKeyDown call onchange', e.target.value);
      onChange(e);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ position: 'relative',
                    width: '100%',
                    marginTop: 8,
                    opacity: loading ? 0.5 : 1,
                  }}>
        <div style={{ position: 'absolute',
                      right: 2,
                      bottom: 5,
                    }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ fontSize: 16,
                     height: 30,
                     width: 30,
                     borderRadius: 15,
                     display: 'inline-block',
                   }}
            disabled={loading || disabled}
            >
            <div style={{ display: 'flex',
                          justifyContent: 'center',
                        }}>
              {loading ? <Loading width={16} /> : <FaArrowRight size={16} /> }
            </div>
          </button>
        </div>

        <div style={{ width: '100%' }}>
          <Textarea
            type="text"
            style={{ width: '100%',
                     fontFamily: 'sans-serif',
                     fontSize: 16,
                     resize: 'none',
                     padding: 8,
                     paddingLeft: 12,
                     paddingRight: 36,
                     border: 0,
                     borderRadius: 18,
                     minHeight: 80,
                   }}
            type="text"
            value={prompt}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={'Example: "Look for links to articles, and on each article page, find the author, the publication date, and summarize it in 2-10 words."'}
          />
        </div>
      </div>
    </form>
  );
}
