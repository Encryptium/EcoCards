from flask import Flask, request, jsonify, render_template, redirect, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import os
import uuid
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = "testkey"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        conn = sqlite3.connect('db.sqlite3')
        c = conn.cursor()

        c.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = c.fetchone()
        conn.close()

        if user and check_password_hash(user[2], password):
            session['user'] = user[1]
            return redirect('/dashboard')

        return redirect('/login')
        
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        is_educator = 1 if 'is-educator' in request.form else 0
        password = request.form['password']
        password2 = request.form['password-confirmation']
        if password != password2:
            return redirect('/register')
        conn = sqlite3.connect('db.sqlite3')
        c = conn.cursor()

        c.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = c.fetchone()
        if user:
            return redirect('/register')
        
        c.execute('INSERT INTO users (name, email, password, educator, sections) VALUES (?, ?, ?, ?, ?)', (name, email, generate_password_hash(password), is_educator, "[]"))
        conn.commit()
        conn.close()
        session['user'] = email
        return redirect('/dashboard')
    return render_template('register.html')

@app.route('/dashboard')
def dashboard():
    if 'user' in session:
        conn = sqlite3.connect('db.sqlite3')
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE email = ?', (session['user'],))
        user = c.fetchone()
        conn.close()
        return render_template('dashboard.html', user=user)
    return redirect('/login')

@app.route('/create-section', methods=['GET', 'POST'])
def create_section():
    if request.method == 'POST':
        section_name = request.form['section-name']
        section_id = uuid.uuid4().hex

        conn = sqlite3.connect('db.sqlite3')
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE email = ?', (session['user'],))
        user = c.fetchone()

        c.execute('INSERT INTO sections (id, name, members, assignments) VALUES (?, ?, ?, ?)', (section_id, section_name, f"[{user[1]}]", "[]"))

        # Convert the sections string to a list, append new section_id, and convert back to string
        user_sections = json.loads(user[4])
        user_sections.append(section_id)
        c.execute('UPDATE users SET sections = ? WHERE email = ?', (json.dumps(user_sections), session['user']))
        conn.commit()
        conn.close()
        return redirect('/section/' + section_id)
    return render_template('create-section.html')

@app.route('/section/<string:section_id>')
def section(section_id):
    if 'user' in session:
        conn = sqlite3.connect('db.sqlite3')
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE email = ?', (session['user'],))
        user = c.fetchone()

        # Convert the sections string to a list
        user_sections = json.loads(user[4])
        if str(section_id) not in user_sections:
            return redirect('/dashboard')

        c.execute('SELECT * FROM sections WHERE id = ?', (section_id,))
        section = c.fetchone()

        conn.close()
        return render_template('section.html', user=user, section=section)
    return redirect('/login')


@app.route('/section/<string:section_id>/add-assignment', methods=['GET', 'POST'])
def add_assignment(section_id):
    if 'user' in session:
        conn = sqlite3.connect('db.sqlite3')
        c = conn.cursor()
        c.execute('SELECT * FROM users WHERE email = ?', (session['user'],))
        user = c.fetchone()

        # Convert the sections string to a list
        user_sections = json.loads(user[4])
        if str(section_id) not in user_sections:
            return redirect('/dashboard')

        c.execute('SELECT * FROM sections WHERE id = ?', (section_id,))
        section = c.fetchone()

        if request.method == 'POST':
            assignment_name = request.form['assignment-name']
            assignment_description = request.form['assignment-description']
            assignment_file = request.files['assignment-file']
            assignment_id = uuid.uuid4().hex

            c.execute('INSERT INTO assignments (id, section_id, name, description, document, fields, scores) VALUES (?, ?, ?, ?, ?, ?, ?)', (assignment_id, section_id, assignment_name, assignment_description, assignment_file, "[]", "{}"))

            # Convert the assignments string to a list, append new assignment_id, and convert back to string
            section_assignments = json.loads(section[4])
            section_assignments.append(assignment_id)
            c.execute('UPDATE sections SET assignments = ? WHERE id = ?', (json.dumps(section_assignments), section_id))
            conn.commit()
            conn.close()
            return redirect('/section/' + section_id)
        conn.close()
        return render_template('add-assignment.html', user=user, section=section)
    return redirect('/login')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/')

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=8080)