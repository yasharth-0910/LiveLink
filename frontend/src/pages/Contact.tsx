import { useState } from 'react';
import { Video, Mail, Phone, MapPin, Send, Github, Twitter, Linkedin } from 'lucide-react';
import emailjs from '@emailjs/browser';

const Contact = (): JSX.Element => {


  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Sending email via EmailJS
    emailjs.send(
      import.meta.env.VITE_SERVICE_ID as string,
      import.meta.env.VITE_TEMPLATE_ID as string,
      {
        from_name: formData.name as string,
        from_email: formData.email as string,
        message: formData.message as string,
      },
      import.meta.env.VITE_PUBLIC_KEY as string
    )
    .then((response: any) => {
      console.log('Email sent successfully:', response.status, response.text);
    })
    .catch((error: any) => {
      console.error('Failed to send email:', error);
    });

    // Reset form after submission
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center">
          <Video className="h-8 w-8 text-cyan-400" />
          <a href="/"><span className="ml-2 text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">LiveLink</span></a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-extrabold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          Contact Us
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-cyan-400">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:ring focus:ring-cyan-400/50 focus:ring-opacity-50 text-white"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:ring focus:ring-cyan-400/50 focus:ring-opacity-50 text-white"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 rounded-md bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:ring focus:ring-cyan-400/50 focus:ring-opacity-50 text-white"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-gray-900 font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50 flex items-center justify-center"
              >
                Send Message <Send className="ml-2 h-5 w-5" />
              </button>
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Contact Information</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="h-6 w-6 text-cyan-400 mr-3" />
                  <span>yasharthsingh0910@gmail.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-6 w-6 text-cyan-400 mr-3" />
                  <span>+91 1234567890</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-6 w-6 text-cyan-400 mr-3" />
                  <span>Delhi NCR, India</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Connect With Us</h2>
              <div className="flex space-x-4">
                <a href="https://github.com/yasharth-0910" className="text-gray-300 hover:text-cyan-400 transition-colors duration-300">
                  <Github className="h-8 w-8" />
                </a>
                <a href="https://twitter.com/Yash_mera_naam" className="text-gray-300 hover:text-cyan-400 transition-colors duration-300">
                  <Twitter className="h-8 w-8" />
                </a>
                <a href="https://www.linkedin.com/in/yasharth-singh-b2493b284/" className="text-gray-300 hover:text-cyan-400 transition-colors duration-300">
                  <Linkedin className="h-8 w-8" />
                </a>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">Our Global Reach</h2>
              <div className="relative h-48 bg-gray-700 rounded-lg overflow-hidden">
                <div className="absolute inset-0 bg-[url('/placeholder.svg?height=300&width=400')] bg-cover bg-center opacity-50"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold text-cyan-400">Connecting the World through LiveLink</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-400">
            © 2024 LiveLink.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Contact;
