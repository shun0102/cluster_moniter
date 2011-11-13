require 'webrick'

DOCUMENT_ROOT = './'
DEFAULT_PORT=8080

port = ARGV[0].to_i

server = WEBrick::HTTPServer.new({
  :DocumentRoot => DOCUMENT_ROOT,
  :BindAddress => '0.0.0.0',
  :Port => port || DEFAULT_PORT
})

['INT', 'TERM'].each {|signal|
  Signal.trap(signal){ server.shutdown }
}

server.start
